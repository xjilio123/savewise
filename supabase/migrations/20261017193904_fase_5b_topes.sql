-- SaveWise · Fase 5b: topes por categoría con aviso al 80%.

alter table public.categorias
  add column tope numeric(14, 2) check (tope is null or (tope > 0 and tope < 1000000000)),
  add column tope_avisado date;

-- Inicio del periodo financiero (mismo cálculo que periodoFinanciero en TypeScript):
-- empieza el día de pago; si ese día no existe en el mes, el último día del mes.
create or replace function private.inicio_periodo(p_hoy date, p_dia integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when extract(day from p_hoy)::integer
         >= least(greatest(p_dia, 1), extract(day from (date_trunc('month', p_hoy) + interval '1 month - 1 day'))::integer)
    then date_trunc('month', p_hoy)::date
         + (least(greatest(p_dia, 1), extract(day from (date_trunc('month', p_hoy) + interval '1 month - 1 day'))::integer) - 1)
    else date_trunc('month', p_hoy - interval '1 month')::date
         + (least(greatest(p_dia, 1), extract(day from (date_trunc('month', p_hoy - interval '1 month') + interval '1 month - 1 day'))::integer) - 1)
  end;
$$;

-- Recordatorios: renovaciones, día de pago y topes al 80% (un aviso por categoría y periodo).
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
    union all
    select
      t.user_id,
      t.nombre || ' al ' || round(t.gastado / t.tope * 100)::text || '% de su tope',
      'Llevas ' || to_char(t.gastado, 'FM999999990.00') || ' de ' || to_char(t.tope, 'FM999999990.00') || ' en este periodo.',
      '/dashboard'::text
    from topes_alcanzados t
  )
  select s.endpoint, s.p256dh, s.auth, a.titulo, a.cuerpo, a.url
  from avisos a
  join public.push_suscripciones s on s.user_id = a.user_id;
end;
$$;

revoke all on function private.inicio_periodo(date, integer) from public, anon, authenticated;
