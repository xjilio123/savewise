-- Pruebas de seguridad de la base de datos (pgTAP). Se ejecutan con: supabase test db
-- Si una política RLS se rompe, estas pruebas fallan y el cambio no se publica.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

-- ---------- Preparación (como superusuario) ----------
insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');

-- 1-5. RLS activo en todas las tablas
select ok((select relrowsecurity from pg_class where oid = 'public.perfiles'::regclass), 'RLS activo en perfiles');
select ok((select relrowsecurity from pg_class where oid = 'public.categorias'::regclass), 'RLS activo en categorias');
select ok((select relrowsecurity from pg_class where oid = 'public.metas'::regclass), 'RLS activo en metas');
select ok((select relrowsecurity from pg_class where oid = 'public.movimientos'::regclass), 'RLS activo en movimientos');
select ok((select relrowsecurity from pg_class where oid = 'public.tipos_cambio'::regclass), 'RLS activo en tipos_cambio');

-- 6. Registro cerrado: un correo no autorizado no puede crear cuenta
select throws_ok(
  $$insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ff', 'intruso@prueba.local')$$,
  'P0001', 'Registro no permitido',
  'Un correo fuera de la lista no puede registrarse'
);

-- 7. El trigger crea el perfil y las 9 categorías de cada usuario nuevo
select is(
  (select count(*) from public.categorias where user_id = '00000000-0000-0000-0000-00000000000a'),
  9::bigint,
  'Cada usuario nuevo recibe sus 9 categorías'
);

-- ---------- Como usuario A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

insert into public.movimientos (user_id, tipo, concepto, monto)
values ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Spotify', 8.22);

select is((select count(*) from public.movimientos), 1::bigint, 'A ve su propio movimiento');

-- ---------- Como usuario B ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

-- 9. B no ve los movimientos de A
select is_empty($$select * from public.movimientos$$, 'B no ve los movimientos de A');

-- 10. B no ve el perfil de A (solo el suyo)
select is((select count(*) from public.perfiles), 1::bigint, 'B solo ve su propio perfil');

-- 11. B no puede modificar movimientos de A (la actualización no toca ninguna fila)
select is(
  (with cambio as (update public.movimientos set monto = 1 returning 1) select count(*) from cambio),
  0::bigint,
  'B no puede modificar movimientos de A'
);

-- 12. B no puede crear movimientos a nombre de A
select throws_ok(
  $$insert into public.movimientos (user_id, tipo, concepto, monto)
    values ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Falso', 1)$$,
  '42501',
  null,
  'B no puede insertar movimientos a nombre de A'
);

-- 13. Un usuario autenticado no puede escribir tipos de cambio
select throws_ok(
  $$insert into public.tipos_cambio (fecha, moneda, valor_pen) values ('2026-10-17', 'USD', 3.5)$$,
  '42501',
  null,
  'Solo el servidor puede escribir tipos de cambio'
);

reset role;

-- 14. B no puede usar una categoría de A. Como superusuario se toma el id; B intenta usarlo y falla la FK compuesta.
select set_config('pruebas.categoria_a',
  (select id::text from public.categorias where user_id = '00000000-0000-0000-0000-00000000000a' limit 1), true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select throws_ok(
  format(
    $$insert into public.movimientos (user_id, tipo, concepto, monto, categoria_id)
      values ('00000000-0000-0000-0000-00000000000b', 'GASTO', 'Cruce', 1, %L)$$,
    current_setting('pruebas.categoria_a')
  ),
  '23503',
  null,
  'B no puede apuntar a una categoría de A'
);

reset role;

-- 15. Un visitante sin sesión (anon) no puede leer nada
set local role anon;
select throws_ok($$select * from public.movimientos$$, '42501', null, 'anon no puede leer movimientos');
reset role;

select * from finish();
rollback;
