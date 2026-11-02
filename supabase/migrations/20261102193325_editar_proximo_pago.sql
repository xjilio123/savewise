-- SaveWise · Editar el próximo pago del calendario (precio y fecha) sin tocar el historial.
-- Se guarda en el último movimiento de la serie: proximo_monto y proximo_fecha. El registro automático
-- y el aviso de renovación los usan; el movimiento nuevo nace sin ellos, así que el cambio vale una vez
-- y desde ahí la serie sigue con el nuevo monto y la nueva fecha.

alter table public.movimientos
  add column proximo_monto numeric(14, 2) check (proximo_monto is null or (proximo_monto > 0 and proximo_monto < 1000000000)),
  add column proximo_fecha date;

-- Registro automático de lo que se repite cada mes (igual que antes, más el próximo pago editado).
-- Una proximo_fecha que no es posterior al movimiento (por ejemplo, si después se editó su fecha) se ignora.
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

  for i in 1..3 loop
    with ultimos as (
      select distinct on (m.user_id, lower(m.concepto)) m.*,
        case when m.proximo_fecha > m.fecha then m.proximo_fecha else (m.fecha + interval '1 month')::date end as siguiente
      from public.movimientos m
      order by m.user_id, lower(m.concepto), m.fecha desc, m.creado desc
    ),
    insertados as (
      insert into public.movimientos
        (user_id, fecha, tipo, categoria_id, meta_id, deuda_id, concepto, monto, moneda, tipo_cambio, recurrente, nota)
      select
        u.user_id, u.siguiente, u.tipo, u.categoria_id, u.meta_id, u.deuda_id,
        u.concepto, coalesce(u.proximo_monto, u.monto), u.moneda, u.tipo_cambio, true, 'Registrado automáticamente'
      from ultimos u
      left join public.deudas d on d.id = u.deuda_id
      where u.recurrente
        and u.siguiente <= v_hoy
        and coalesce(d.cerrada, false) = false
      returning 1
    )
    select count(*) into v_nuevos from insertados;

    v_total := v_total + v_nuevos;
    exit when v_nuevos = 0;
  end loop;

  return v_total;
end;
$$;

-- Avisos del día: la renovación en 3 días usa el próximo pago editado (resto igual que antes).
create or replace function public.recordatorios_del_dia(p_token text)
returns table (r_endpoint text, r_p256dh text, r_auth text, r_titulo text, r_cuerpo text, r_url text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_manana date := (now() at time zone 'America/Lima')::date + 1;
  v_ultimo_dia integer := extract(day from (date_trunc('month', v_hoy) + interval '1 month - 1 day'))::integer;
  v_ultimo_dia_manana integer := extract(day from (date_trunc('month', v_manana) + interval '1 month - 1 day'))::integer;
begin
  if not private.cron_autorizado(p_token) then
    raise exception 'No autorizado';
  end if;

  return query
  with ultimos as (
    select distinct on (m.user_id, lower(m.concepto))
      m.user_id, m.concepto, m.moneda, m.fecha, m.recurrente, m.tipo,
      -- El próximo cobro: el que se editó en el calendario o, si no, un mes después.
      case when m.proximo_fecha > m.fecha then m.proximo_fecha else (m.fecha + interval '1 month')::date end as siguiente,
      coalesce(m.proximo_monto, m.monto) as monto,
      count(*) over (partition by m.user_id, lower(m.concepto)) as veces
    from public.movimientos m
    order by m.user_id, lower(m.concepto), m.fecha desc, m.creado desc
  ),
  gasto_categoria as (
    select c.id, c.user_id, c.nombre, c.tope, private.inicio_periodo(v_hoy, p.dia_pago) as inicio,
      coalesce(sum(m.monto_base) filter (
        where m.tipo in ('GASTO', 'OCIO') and m.fecha >= private.inicio_periodo(v_hoy, p.dia_pago) and m.fecha <= v_hoy
      ), 0) as gastado
    from public.categorias c
    join public.perfiles p on p.id = c.user_id
    left join public.movimientos m on m.categoria_id = c.id
    where c.tope is not null
    group by c.id, c.user_id, c.nombre, c.tope, p.dia_pago
  ),
  topes_alcanzados as (
    update public.categorias c
    set tope_avisado = g.inicio
    from gasto_categoria g
    where c.id = g.id
      and g.gastado >= g.tope * 0.8
      and (c.tope_avisado is null or c.tope_avisado < g.inicio)
    returning c.user_id, g.nombre, g.gastado, g.tope
  ),
  avisos as (
    -- Cada 3 renovaciones de una suscripción, el aviso pregunta si se sigue usando.
    select
      u.user_id,
      case when u.pregunta then '¿Sigues usando ' || u.concepto || '?' else 'Renovación en 3 días' end as titulo,
      u.concepto || ' se renueva el ' || to_char(u.siguiente, 'DD/MM')
        || ' · ' || u.moneda || ' ' || to_char(u.monto, 'FM999999990.00')
        || case when u.pregunta then '. Si ya no lo usas, toca para dejar de repetirlo.' else '' end as cuerpo,
      case when u.pregunta then '/dashboard' else '/historial' end as url
    from (
      select x.*, (x.tipo in ('GASTO', 'OCIO') and x.veces >= 3 and x.veces % 3 = 0) as pregunta
      from ultimos x
    ) u
    where u.recurrente
      and u.siguiente = v_hoy + 3
    union all
    select
      p.id,
      'Hoy cobras'::text,
      'Reparte tu sueldo: decide cuánto va a gastos, ahorros y Para mí.'::text,
      '/'::text
    from public.perfiles p
    where p.sueldo_mensual > 0
      and extract(day from v_hoy)::integer = least(p.dia_pago, v_ultimo_dia)
    union all
    select
      t.user_id,
      t.nombre || ' al ' || round(t.gastado / t.tope * 100)::text || '% de su tope',
      'Llevas ' || to_char(t.gastado, 'FM999999990.00') || ' de ' || to_char(t.tope, 'FM999999990.00') || ' en este periodo.',
      '/dashboard'::text
    from topes_alcanzados t
    union all
    select
      d.user_id,
      'Mañana pagas ' || d.nombre,
      case when d.cuota_mensual is null then 'Revisa el monto a pagar.'
           else 'Cuota de ' || d.moneda || ' ' || to_char(d.cuota_mensual, 'FM999999990.00') || '.' end,
      '/deudas'::text
    from public.deudas d
    where not d.cerrada
      and d.dia_pago is not null
      and extract(day from v_manana)::integer = least(d.dia_pago, v_ultimo_dia_manana)
    union all
    select
      p.id,
      'Respaldo mensual'::text,
      'Descarga tu respaldo completo en Ajustes y guárdalo en iCloud Drive o Google Drive.'::text,
      '/ajustes'::text
    from public.perfiles p
    where extract(day from v_hoy)::integer = 1
    union all
    -- El día de cobro: resumen del periodo que acaba de terminar.
    select
      p.id,
      'Tu resumen del periodo'::text,
      'Gastaste ' || p.moneda_base || ' ' || to_char(r.gastos, 'FM999999990.00')
        || ' y ahorraste ' || p.moneda_base || ' ' || to_char(r.ahorros, 'FM999999990.00')
        || coalesce('. Donde más gastaste: ' || r.principal, '') || '.',
      '/dashboard'::text
    from public.perfiles p
    cross join lateral (
      select
        coalesce(sum(m.monto_base) filter (where m.tipo in ('GASTO', 'OCIO')), 0) as gastos,
        coalesce(sum(m.monto_base) filter (where m.tipo = 'AHORRO'), 0) as ahorros,
        count(*) as cantidad,
        (
          select c.nombre
          from public.movimientos m2
          join public.categorias c on c.id = m2.categoria_id
          where m2.user_id = p.id
            and m2.tipo in ('GASTO', 'OCIO')
            and m2.fecha between private.inicio_periodo(v_hoy - 1, p.dia_pago) and v_hoy - 1
          group by c.nombre
          order by sum(m2.monto_base) desc
          limit 1
        ) as principal
      from public.movimientos m
      where m.user_id = p.id
        and m.fecha between private.inicio_periodo(v_hoy - 1, p.dia_pago) and v_hoy - 1
    ) r
    where extract(day from v_hoy)::integer = least(p.dia_pago, v_ultimo_dia)
      and r.cantidad > 0
    union all
    select
      p.id,
      '¿Se te pasó algo ayer?'::text,
      'Ayer no registraste ningún movimiento. Si gastaste algo, anótalo ahora.'::text,
      '/agregar'::text
    from public.perfiles p
    where exists (select 1 from public.movimientos m where m.user_id = p.id)
      and not exists (
        select 1 from public.movimientos m
        where m.user_id = p.id
          and (m.fecha = v_hoy - 1 or (m.creado at time zone 'America/Lima')::date = v_hoy - 1)
      )
  )
  select s.endpoint, s.p256dh, s.auth, a.titulo, a.cuerpo, a.url
  from avisos a
  join public.push_suscripciones s on s.user_id = a.user_id;
end;
$$;
