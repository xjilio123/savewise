-- SaveWise · Fase 3 (parte 3): Atajo de Siri y recordatorios del cron.

-- SECURITY DEFINER porque el Atajo no tiene sesión: el token ES la autenticación.
-- El usuario sale del token, nunca de los parámetros.
create or replace function public.registrar_por_atajo(
  p_token text,
  p_monto numeric,
  p_concepto text,
  p_tipo text default 'GASTO',
  p_categoria text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.tokens_atajo%rowtype;
  v_concepto text := btrim(coalesce(p_concepto, ''));
  v_moneda text;
  v_categoria uuid;
begin
  if p_token is null or char_length(p_token) not between 32 and 128 then
    raise exception 'Token inválido';
  end if;

  select * into v_token
  from public.tokens_atajo
  where hash_token = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;
  if not found then
    raise exception 'Token inválido';
  end if;

  -- Máximo 10 registros por minuto por token
  if v_token.ventana_inicio is not null and v_token.ventana_inicio > now() - interval '1 minute' then
    if v_token.usos_ventana >= 10 then
      raise exception 'Demasiados registros, espera un minuto';
    end if;
    update public.tokens_atajo set usos_ventana = usos_ventana + 1, ultimo_uso = now() where user_id = v_token.user_id;
  else
    update public.tokens_atajo set usos_ventana = 1, ventana_inicio = now(), ultimo_uso = now() where user_id = v_token.user_id;
  end if;

  if p_monto is null or p_monto <= 0 or p_monto >= 1000000000 or p_monto <> round(p_monto, 2) then
    raise exception 'Monto inválido';
  end if;
  if char_length(v_concepto) not between 1 and 80 then
    raise exception 'Concepto inválido';
  end if;
  if p_tipo is null or p_tipo not in ('GASTO', 'OCIO', 'INGRESO') then
    raise exception 'Tipo inválido';
  end if;

  select moneda_base into v_moneda from public.perfiles where id = v_token.user_id;
  if p_categoria is not null then
    select id into v_categoria
    from public.categorias
    where user_id = v_token.user_id and lower(nombre) = lower(btrim(p_categoria))
    limit 1;
  end if;

  insert into public.movimientos (user_id, tipo, concepto, monto, moneda, tipo_cambio, categoria_id, fecha)
  values (
    v_token.user_id,
    p_tipo::public.tipo_movimiento,
    v_concepto,
    p_monto,
    coalesce(v_moneda, 'PEN'),
    1,
    v_categoria,
    (now() at time zone 'America/Lima')::date
  );

  return json_build_object('concepto', v_concepto, 'monto', p_monto, 'moneda', coalesce(v_moneda, 'PEN'));
end;
$$;

-- Comprueba el secreto del cron contra su huella guardada en private.config.
create or replace function private.cron_autorizado(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_token is not null
    and encode(extensions.digest(p_token, 'sha256'), 'hex') = (select valor from private.config where clave = 'hash_cron');
$$;

create or replace function public.recordatorios_del_dia(p_token text)
returns table (r_endpoint text, r_p256dh text, r_auth text, r_titulo text, r_cuerpo text, r_url text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_ultimo_dia integer := extract(day from (date_trunc('month', v_hoy) + interval '1 month - 1 day'))::integer;
begin
  if not private.cron_autorizado(p_token) then
    raise exception 'No autorizado';
  end if;

  return query
  with ultimos as (
    select distinct on (m.user_id, lower(m.concepto))
      m.user_id, m.concepto, m.monto, m.moneda, m.fecha
    from public.movimientos m
    where m.recurrente
    order by m.user_id, lower(m.concepto), m.fecha desc
  ),
  avisos as (
    select
      u.user_id,
      'Renovación en 3 días'::text as titulo,
      u.concepto || ' se renueva el ' || to_char((u.fecha + interval '1 month')::date, 'DD/MM')
        || ' · ' || u.moneda || ' ' || to_char(u.monto, 'FM999999990.00') as cuerpo,
      '/historial'::text as url
    from ultimos u
    where (u.fecha + interval '1 month')::date = v_hoy + 3
    union all
    select
      p.id,
      'Hoy cobras'::text,
      'Reparte tu sueldo: decide cuánto va a gastos, ahorros y Para mí.'::text,
      '/'::text
    from public.perfiles p
    where p.sueldo_mensual > 0
      and extract(day from v_hoy)::integer = least(p.dia_pago, v_ultimo_dia)
  )
  select s.endpoint, s.p256dh, s.auth, a.titulo, a.cuerpo, a.url
  from avisos a
  join public.push_suscripciones s on s.user_id = a.user_id;
end;
$$;
