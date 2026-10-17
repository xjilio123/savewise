-- SaveWise · Fase 4: gastos recurrentes automáticos y corrección de recordatorios.
-- Regla: manda el movimiento MÁS RECIENTE de cada concepto. Si ese ya no está marcado
-- "se repite", la serie se detiene aunque movimientos anteriores sigan marcados.

create or replace function public.generar_recurrentes(p_token text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_total integer := 0;
  v_nuevos integer;
begin
  if not private.cron_autorizado(p_token) then
    raise exception 'No autorizado';
  end if;

  -- Hasta 3 vueltas por si el cron no corrió algunos días.
  for i in 1..3 loop
    with ultimos as (
      select distinct on (m.user_id, lower(m.concepto)) m.*
      from public.movimientos m
      order by m.user_id, lower(m.concepto), m.fecha desc, m.creado desc
    ),
    insertados as (
      insert into public.movimientos
        (user_id, fecha, tipo, categoria_id, meta_id, concepto, monto, moneda, tipo_cambio, recurrente, nota)
      select
        u.user_id, (u.fecha + interval '1 month')::date, u.tipo, u.categoria_id, u.meta_id,
        u.concepto, u.monto, u.moneda, u.tipo_cambio, true, 'Registrado automáticamente'
      from ultimos u
      where u.recurrente
        and (u.fecha + interval '1 month')::date <= v_hoy
      returning 1
    )
    select count(*) into v_nuevos from insertados;

    v_total := v_total + v_nuevos;
    exit when v_nuevos = 0;
  end loop;

  return v_total;
end;
$$;

-- Recordatorios: misma regla del movimiento más reciente.
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
      m.user_id, m.concepto, m.monto, m.moneda, m.fecha, m.recurrente
    from public.movimientos m
    order by m.user_id, lower(m.concepto), m.fecha desc, m.creado desc
  ),
  avisos as (
    select
      u.user_id,
      'Renovación en 3 días'::text as titulo,
      u.concepto || ' se renueva el ' || to_char((u.fecha + interval '1 month')::date, 'DD/MM')
        || ' · ' || u.moneda || ' ' || to_char(u.monto, 'FM999999990.00') as cuerpo,
      '/historial'::text as url
    from ultimos u
    where u.recurrente
      and (u.fecha + interval '1 month')::date = v_hoy + 3
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

revoke execute on function public.generar_recurrentes(text) from public, authenticated;
grant execute on function public.generar_recurrentes(text) to anon;
