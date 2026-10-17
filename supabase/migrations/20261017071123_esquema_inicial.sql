-- =========================================================
-- SaveWise · esquema inicial
-- Seguridad: RLS en todas las tablas, lista de correos permitidos,
-- funciones privilegiadas fuera del esquema expuesto (private).
-- =========================================================

-- Esquema privado: no se expone por la API
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------- Lista de correos permitidos (registro cerrado) ----------
-- Los correos NO se versionan (el repositorio es público). Se cargan una vez en producción:
--   insert into private.correos_permitidos (email) values ('tu-correo@ejemplo.com');
create table private.correos_permitidos (
  email text primary key check (email = lower(email))
);

create or replace function private.verificar_correo_permitido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from private.correos_permitidos where email = lower(new.email)
  ) then
    raise exception 'Registro no permitido';
  end if;
  return new;
end;
$$;

create trigger antes_de_crear_usuario
  before insert on auth.users
  for each row execute function private.verificar_correo_permitido();

-- ---------- Tipos ----------
create type public.tipo_movimiento as enum ('INGRESO', 'GASTO', 'AHORRO', 'PARA_MI', 'OCIO');
create type public.color_app as enum ('rojo', 'azul', 'verde', 'morado', 'negro');

-- ---------- Tablas ----------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 80),
  moneda_base char(3) not null default 'PEN' check (moneda_base ~ '^[A-Z]{3}$'),
  sueldo_mensual numeric(14, 2) not null default 0 check (sueldo_mensual >= 0 and sueldo_mensual < 1000000000),
  moneda_sueldo char(3) not null default 'PEN' check (moneda_sueldo ~ '^[A-Z]{3}$'),
  dia_pago smallint not null default 1 check (dia_pago between 1 and 31),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  color public.color_app not null,
  icono text not null default '' check (char_length(icono) <= 30),
  creado timestamptz not null default now(),
  unique (user_id, nombre),
  unique (id, user_id)
);

create table public.metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  objetivo numeric(14, 2) not null check (objetivo > 0 and objetivo < 1000000000),
  moneda char(3) not null default 'PEN' check (moneda ~ '^[A-Z]{3}$'),
  fecha_objetivo date,
  archivada boolean not null default false,
  creado timestamptz not null default now(),
  unique (user_id, nombre),
  unique (id, user_id)
);

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha date not null default current_date,
  tipo public.tipo_movimiento not null,
  categoria_id uuid,
  meta_id uuid,
  concepto text not null check (char_length(concepto) between 1 and 80),
  monto numeric(14, 2) not null check (monto > 0 and monto < 1000000000),
  moneda char(3) not null default 'PEN' check (moneda ~ '^[A-Z]{3}$'),
  tipo_cambio numeric(18, 8) not null default 1 check (tipo_cambio > 0),
  monto_base numeric(14, 2) generated always as (round(monto * tipo_cambio, 2)) stored,
  recurrente boolean not null default false,
  nota text not null default '' check (char_length(nota) <= 280),
  creado timestamptz not null default now(),
  -- Un movimiento solo puede apuntar a categorías y metas del mismo dueño
  foreign key (categoria_id, user_id) references public.categorias (id, user_id) on delete set null (categoria_id),
  foreign key (meta_id, user_id) references public.metas (id, user_id) on delete set null (meta_id),
  constraint ahorro_con_meta check (tipo <> 'AHORRO' or meta_id is not null)
);

create index movimientos_user_fecha_idx on public.movimientos (user_id, fecha desc, id desc);
create index movimientos_categoria_idx on public.movimientos (categoria_id);
create index movimientos_meta_idx on public.movimientos (meta_id);

create table public.tipos_cambio (
  fecha date not null,
  moneda char(3) not null check (moneda ~ '^[A-Z]{3}$'),
  valor_pen numeric(18, 8) not null check (valor_pen > 0),
  primary key (fecha, moneda)
);

-- ---------- Vista de resumen (respeta RLS de quien consulta) ----------
create view public.resumen_mensual
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', fecha)::date as mes,
  tipo,
  sum(monto_base) as total,
  count(*) as cantidad
from public.movimientos
group by 1, 2, 3;

-- ---------- Triggers ----------
create or replace function private.tocar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado = now();
  return new;
end;
$$;

create trigger perfiles_actualizado
  before update on public.perfiles
  for each row execute function private.tocar_actualizado();

create or replace function private.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80));

  insert into public.categorias (user_id, nombre, color, icono) values
    (new.id, 'Alimentación', 'rojo', 'cart'),
    (new.id, 'Transporte', 'azul', 'bus'),
    (new.id, 'Suscripciones', 'negro', 'repeat'),
    (new.id, 'Servicios', 'verde', 'bolt'),
    (new.id, 'Ocio', 'morado', 'sparkles'),
    (new.id, 'Salud', 'rojo', 'heart'),
    (new.id, 'Educación', 'azul', 'book'),
    (new.id, 'Ahorro', 'verde', 'piggy'),
    (new.id, 'Otros', 'negro', 'dots');
  return new;
end;
$$;

create trigger despues_de_crear_usuario
  after insert on auth.users
  for each row execute function private.crear_perfil();

-- ---------- RLS ----------
alter table public.perfiles enable row level security;
alter table public.categorias enable row level security;
alter table public.metas enable row level security;
alter table public.movimientos enable row level security;
alter table public.tipos_cambio enable row level security;

-- perfiles: solo el propio; se crean por trigger, no se borran desde la app
create policy "perfiles_select_propio" on public.perfiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "perfiles_update_propio" on public.perfiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- categorias
create policy "categorias_select_propias" on public.categorias
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "categorias_insert_propias" on public.categorias
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categorias_update_propias" on public.categorias
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categorias_delete_propias" on public.categorias
  for delete to authenticated using ((select auth.uid()) = user_id);

-- metas
create policy "metas_select_propias" on public.metas
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "metas_insert_propias" on public.metas
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "metas_update_propias" on public.metas
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "metas_delete_propias" on public.metas
  for delete to authenticated using ((select auth.uid()) = user_id);

-- movimientos
create policy "movimientos_select_propios" on public.movimientos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "movimientos_insert_propios" on public.movimientos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "movimientos_update_propios" on public.movimientos
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "movimientos_delete_propios" on public.movimientos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- tipos_cambio: lectura para usuarios con sesión; escritura solo del servidor (service role)
create policy "tipos_cambio_select" on public.tipos_cambio
  for select to authenticated using (true);

-- ---------- Privilegios mínimos ----------
revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.tipos_cambio from authenticated;
revoke insert, delete on public.perfiles from authenticated;
revoke all on function private.verificar_correo_permitido() from public, anon, authenticated;
revoke all on function private.crear_perfil() from public, anon, authenticated;
revoke all on function private.tocar_actualizado() from public, anon, authenticated;
