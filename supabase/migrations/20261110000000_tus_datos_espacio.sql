-- SaveWise · Tus datos: espacio usado por persona, fecha del último respaldo y avisos.
-- El cupo es orientativo (15 MB por persona: 500 MB del plan gratis entre ~30 personas, con margen).
-- No bloquea nada: solo informa y avisa.

alter table public.perfiles
  add column ultimo_respaldo timestamptz,
  add column espacio_avisado timestamptz;

-- Dueños de la app: ven el total de la base y reciben su aviso. Se cargan aparte (no se versionan):
--   insert into private.duenos (user_id) values ('<uuid>');
create table private.duenos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  avisado timestamptz
);
alter table private.duenos enable row level security;
revoke all on private.duenos from public, anon, authenticated;

create or replace function private.cupo_espacio()
returns bigint
language sql
immutable
set search_path = ''
as $$ select 15::bigint * 1024 * 1024 $$;

create or replace function private.limite_base()
returns bigint
language sql
immutable
set search_path = ''
as $$ select 500::bigint * 1024 * 1024 $$;
revoke all on function private.cupo_espacio() from public, anon, authenticated;
revoke all on function private.limite_base() from public, anon, authenticated;

-- Bytes aproximados de cada persona: su parte de cada tabla (el tamaño de sus filas sobre el de todas),
-- aplicada al tamaño real de la tabla con sus índices.
create or replace function private.espacio_por_persona()
returns table (user_id uuid, bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with filas as (
    select 'public.movimientos' as tabla, t.user_id, pg_column_size(t.*)::numeric as b from public.movimientos t
    union all select 'public.metas', t.user_id, pg_column_size(t.*) from public.metas t
    union all select 'public.deudas', t.user_id, pg_column_size(t.*) from public.deudas t
    union all select 'public.prestamos', t.user_id, pg_column_size(t.*) from public.prestamos t
    union all select 'public.categorias', t.user_id, pg_column_size(t.*) from public.categorias t
    union all select 'public.perfiles', t.id, pg_column_size(t.*) from public.perfiles t
    union all select 'public.push_suscripciones', t.user_id, pg_column_size(t.*) from public.push_suscripciones t
    union all select 'public.tokens_atajo', t.user_id, pg_column_size(t.*) from public.tokens_atajo t
    union all select 'private.uso_ia', t.user_id, pg_column_size(t.*) from private.uso_ia t
  ),
  tablas as (
    select f.tabla, sum(f.b) as filas, pg_total_relation_size(f.tabla::regclass) as tamano
    from filas f
    group by f.tabla
  )
  select f.user_id, round(sum(f.b / t.filas * t.tamano))::bigint
  from filas f
  join tablas t on t.tabla = f.tabla
  group by f.user_id;
$$;
revoke all on function private.espacio_por_persona() from public, anon, authenticated;

-- Lo que muestra Ajustes › Tus datos: tu espacio aproximado, cuántas cosas guardas y tu último respaldo.
create or replace function public.mi_espacio()
returns table (bytes bigint, movimientos integer, metas integer, deudas integer, ultimo_respaldo timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select e.bytes from private.espacio_por_persona() e where e.user_id = auth.uid()), 0),
    (select count(*)::integer from public.movimientos m where m.user_id = auth.uid()),
    (select count(*)::integer from public.metas t where t.user_id = auth.uid()),
    (select count(*)::integer from public.deudas d where d.user_id = auth.uid()),
    (select p.ultimo_respaldo from public.perfiles p where p.id = auth.uid())
  where auth.uid() is not null;
$$;
revoke all on function public.mi_espacio() from public, anon;
grant execute on function public.mi_espacio() to authenticated;

-- Total de la base, solo para los dueños (a cualquier otra persona no le devuelve nada).
create or replace function public.espacio_app()
returns table (bytes bigint, personas integer)
language sql
stable
security definer
set search_path = ''
as $$
  select pg_database_size(current_database()), (select count(*)::integer from public.perfiles)
  where exists (select 1 from private.duenos d where d.user_id = auth.uid());
$$;
revoke all on function public.espacio_app() from public, anon;
grant execute on function public.espacio_app() to authenticated;

-- Avisos del día: el respaldo mensual solo si pasaron 30 días, el espacio casi lleno y el aviso al dueño
-- (resto igual que antes).
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
  -- Espacio casi lleno (90% del cupo): se avisa una vez; si baja del 90%, se puede volver a avisar.
  espacio_cambiado as (
    update public.perfiles p
    set espacio_avisado = case when e.bytes >= private.cupo_espacio() * 0.9 then now() end
    from private.espacio_por_persona() e
    where e.user_id = p.id
      and (e.bytes >= private.cupo_espacio() * 0.9) = (p.espacio_avisado is null)
    returning p.id as user_id, (e.bytes >= private.cupo_espacio() * 0.9) as lleno
  ),
  -- La base de la app pasa el 80% del plan gratis: aviso al dueño, como mucho cada 30 días.
  dueno_avisado as (
    update private.duenos d
    set avisado = now()
    where pg_database_size(current_database()) >= private.limite_base() * 0.8
      and (d.avisado is null or d.avisado < now() - interval '30 days')
    returning d.user_id
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
      'Hace más de 30 días que no descargas tu respaldo. Descárgalo en Ajustes › Tus datos y guárdalo en iCloud Drive o Google Drive.'::text,
      '/ajustes'::text
    from public.perfiles p
    where extract(day from v_hoy)::integer = 1
      and (p.ultimo_respaldo is null or p.ultimo_respaldo < now() - interval '30 days')
    union all
    select
      e.user_id,
      'Tu espacio está casi lleno'::text,
      'Usas más del 90% de tu espacio. Descarga tu respaldo en Ajustes › Tus datos para no perder nada.'::text,
      '/ajustes'::text
    from espacio_cambiado e
    where e.lleno
    union all
    select
      d.user_id,
      'La base de SaveWise pasa el 80%'::text,
      'Usa ' || round(pg_database_size(current_database()) / 1048576.0)::text
        || ' MB de 500 MB del plan gratis de Supabase.',
      '/ajustes'::text
    from dueno_avisado d
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
