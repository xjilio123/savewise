-- SaveWise · Fase 5c: deudas y tarjetas.

create type public.tipo_deuda as enum ('tarjeta', 'prestamo', 'otro');

create table public.deudas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  tipo public.tipo_deuda not null default 'tarjeta',
  monto_total numeric(14, 2) not null check (monto_total > 0 and monto_total < 1000000000),
  cuota_mensual numeric(14, 2) check (cuota_mensual is null or (cuota_mensual > 0 and cuota_mensual < 1000000000)),
  dia_pago smallint check (dia_pago is null or dia_pago between 1 and 31),
  tea numeric(7, 2) check (tea is null or (tea >= 0 and tea <= 1000)),
  moneda char(3) not null default 'PEN' check (moneda ~ '^[A-Z]{3}$'),
  cerrada boolean not null default false,
  creado timestamptz not null default now(),
  unique (user_id, nombre),
  unique (id, user_id)
);
alter table public.deudas enable row level security;
create policy "deudas_select_propias" on public.deudas
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "deudas_insert_propias" on public.deudas
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "deudas_update_propias" on public.deudas
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "deudas_delete_propias" on public.deudas
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.deudas from anon;

-- Un pago es un movimiento vinculado a su deuda (solo a deudas del mismo dueño).
alter table public.movimientos add column deuda_id uuid;
alter table public.movimientos
  add constraint movimientos_deuda_id_user_id_fkey
  foreign key (deuda_id, user_id) references public.deudas (id, user_id) on delete set null (deuda_id);
create index movimientos_deuda_idx on public.movimientos (deuda_id);

-- Recordatorios: renovaciones, día de pago, topes al 80% y pagos de deudas para mañana.
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
  )
  select s.endpoint, s.p256dh, s.auth, a.titulo, a.cuerpo, a.url
  from avisos a
  join public.push_suscripciones s on s.user_id = a.user_id;
end;
$$;
