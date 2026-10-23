-- SaveWise · Atajo de Siri: un gasto no puede superar lo que queda sin asignar en el periodo
-- (la misma regla que la app). Ocio sale de la bolsa Para mí e ingreso suma, así que no se revisan.
-- Si no alcanza, el error lleva la moneda y lo disponible ("Sin dinero|PEN|120.50") para que
-- /api/atajo arme el mensaje; nunca incluye datos de otra persona.

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
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_sueldo numeric;
  v_dia integer;
  v_inicio date;
  v_fin date;
  v_sin_asignar numeric;
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

  select moneda_base, sueldo_mensual, dia_pago into v_moneda, v_sueldo, v_dia
  from public.perfiles where id = v_token.user_id;

  -- Lo sin asignar del periodo actual: sueldo + ingresos − gastos − ahorros − bolsa Para mí.
  if p_tipo = 'GASTO' then
    v_inicio := private.inicio_periodo(v_hoy, coalesce(v_dia, 1));
    v_fin := private.inicio_periodo((v_inicio + interval '1 month')::date, coalesce(v_dia, 1));
    select coalesce(v_sueldo, 0)
         + coalesce(sum(case when m.tipo = 'INGRESO' then m.monto_base else -m.monto_base end), 0)
    into v_sin_asignar
    from public.movimientos m
    where m.user_id = v_token.user_id
      and m.fecha >= v_inicio and m.fecha < v_fin
      and m.tipo in ('INGRESO', 'GASTO', 'AHORRO', 'PARA_MI');

    if v_sin_asignar <= 0 or p_monto > v_sin_asignar then
      raise exception 'Sin dinero|%|%', coalesce(v_moneda, 'PEN'), round(v_sin_asignar, 2);
    end if;
  end if;

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
    v_hoy
  );

  return json_build_object('concepto', v_concepto, 'monto', p_monto, 'moneda', coalesce(v_moneda, 'PEN'));
end;
$$;
