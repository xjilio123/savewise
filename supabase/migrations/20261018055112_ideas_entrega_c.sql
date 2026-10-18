-- Ideas (entrega C): "Me deben", resumen del periodo el día de cobro y "¿Sigues usando…?".

-- Me deben: préstamos que hiciste a otras personas. Es una lista aparte: no toca tus movimientos.
create table public.prestamos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  persona text not null check (char_length(persona) between 1 and 60),
  concepto text not null default '' check (char_length(concepto) <= 80),
  monto numeric(14, 2) not null check (monto > 0 and monto < 1000000000),
  moneda char(3) not null default 'PEN' check (moneda ~ '^[A-Z]{3}$'),
  fecha date not null default ((now() at time zone 'America/Lima')::date),
  cobrado boolean not null default false,
  cobrado_en date,
  creado timestamptz not null default now()
);
create index prestamos_user_idx on public.prestamos (user_id);
alter table public.prestamos enable row level security;
create policy "prestamos_select_propios" on public.prestamos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "prestamos_insert_propios" on public.prestamos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "prestamos_update_propios" on public.prestamos
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "prestamos_delete_propios" on public.prestamos
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.prestamos from anon;

-- Recordatorios: resumen del periodo el día de cobro y "¿Sigues usando…?" cada 3 renovaciones.
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
      m.user_id, m.concepto, m.monto, m.moneda, m.fecha, m.recurrente, m.tipo,
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
      u.concepto || ' se renueva el ' || to_char((u.fecha + interval '1 month')::date, 'DD/MM')
        || ' · ' || u.moneda || ' ' || to_char(u.monto, 'FM999999990.00')
        || case when u.pregunta then '. Si ya no lo usas, toca para dejar de repetirlo.' else '' end as cuerpo,
      case when u.pregunta then '/dashboard' else '/historial' end as url
    from (
      select x.*, (x.tipo in ('GASTO', 'OCIO') and x.veces >= 3 and x.veces % 3 = 0) as pregunta
      from ultimos x
    ) u
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
