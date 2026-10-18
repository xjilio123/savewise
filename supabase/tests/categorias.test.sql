-- Pruebas (pgTAP): categorías propias.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into private.correos_permitidos (email) values ('a@prueba.local');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 1. Se puede crear una categoría con un color libre
select lives_ok(
  $$insert into public.categorias (id, nombre, color) values ('c0000000-0000-0000-0000-00000000000a', 'Mascotas', 'amarillo')$$,
  'Categoría nueva con un color libre'
);

-- 2. No con un color que ya usa otra
select throws_ok(
  $$insert into public.categorias (nombre, color) values ('Regalos', 'naranja')$$,
  '23505', null,
  'No se repite el color de otra categoría'
);

-- 3. El gris está reservado para "Sin categoría"
select throws_ok(
  $$insert into public.categorias (nombre, color) values ('Regalos', 'gris')$$,
  '23514', null,
  'Ninguna categoría puede ser gris'
);

-- 4-5. Al eliminarla, sus movimientos se conservan sin categoría
insert into public.movimientos (tipo, concepto, monto, categoria_id)
values ('GASTO', 'Comida del gato', 30, 'c0000000-0000-0000-0000-00000000000a');
delete from public.categorias where id = 'c0000000-0000-0000-0000-00000000000a';
select is((select count(*) from public.movimientos where concepto = 'Comida del gato'), 1::bigint, 'El movimiento se conserva');
select is(
  (select categoria_id from public.movimientos where concepto = 'Comida del gato'),
  null::uuid,
  'Queda sin categoría'
);
reset role;

select * from finish();
rollback;
