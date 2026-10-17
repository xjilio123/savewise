-- Ideas pequeñas: reto de 52 semanas y recordatorio cuando ayer no se registró nada.

-- Monto base del reto de 52 semanas (semana N = N × base). null = meta normal.
alter table public.metas
  add column reto_base numeric(14, 2) check (reto_base is null or (reto_base > 0 and reto_base <= 1000));

-- Recordatorios: se suma "¿Se te pasó algo ayer?" (solo si ya usas la app y ayer no hubo movimientos).
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
      'Descarga tu respaldo completo en Ajustes y guárdalo en Archivos o iCloud Drive.'::text,
      '/ajustes'::text
    from public.perfiles p
    where extract(day from v_hoy)::integer = 1
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
