-- Pruebas (pgTAP): cada categoría con un color distinto.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into private.correos_permitidos (email) values ('a@prueba.local');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local');

-- 1. Una cuenta nueva recibe 9 categorías con 9 colores distintos
select is(
  (select count(distinct color) from public.categorias where user_id = '00000000-0000-0000-0000-00000000000a'),
  9::bigint,
  'Las 9 categorías por defecto tienen colores distintos'
);

-- 2. La base no permite repetir un color
select throws_ok(
  $$update public.categorias set color = 'rojo'
    where user_id = '00000000-0000-0000-0000-00000000000a' and nombre = 'Alimentación'$$,
  '23505', null,
  'Dos categorías no pueden compartir color'
);

-- 3. Alimentación usa uno de los colores nuevos
select is(
  (select color::text from public.categorias where user_id = '00000000-0000-0000-0000-00000000000a' and nombre = 'Alimentación'),
  'naranja',
  'Alimentación es naranja'
);

-- 4. El gasto sin categoría sale en gris (no se confunde con "Otros")
insert into public.movimientos (user_id, tipo, concepto, monto, fecha)
values ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Varios', 10, '2026-10-10');
select is(
  (select color::text from public.gastos_por_categoria('2026-10-01', '2026-10-31') where categoria_id is null),
  'gris',
  'Sin categoría usa gris'
);

select * from finish();
rollback;
