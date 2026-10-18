-- Pruebas (pgTAP): eliminar metas sin perder aportes por accidente.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');
insert into public.metas (id, user_id, nombre, objetivo) values
  ('e0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Navidad', 500),
  ('e0000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Viaje', 900),
  ('e0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Meta de B', 100);
insert into public.movimientos (user_id, tipo, concepto, monto, meta_id) values
  ('00000000-0000-0000-0000-00000000000a', 'AHORRO', 'Aporte 1', 100, 'e0000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000a', 'AHORRO', 'Aporte 2', 50, 'e0000000-0000-0000-0000-00000000000a');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 1. Una meta con aportes no se puede borrar sin decidir qué pasa con ellos
select throws_ok(
  $$delete from public.metas where id = 'e0000000-0000-0000-0000-00000000000a'$$,
  '23514', null,
  'La base no deja huérfanos a los aportes'
);

-- 2. No se pueden mover aportes a la meta de otra persona
select throws_ok(
  $$update public.movimientos set meta_id = 'e0000000-0000-0000-0000-00000000000b'
    where meta_id = 'e0000000-0000-0000-0000-00000000000a'$$,
  '23503', null,
  'La llave compuesta impide mover aportes a una meta ajena'
);

-- 3-4. Moverlos a otra meta propia y luego borrar la meta funciona
update public.movimientos set meta_id = 'e0000000-0000-0000-0000-0000000000a2'
where meta_id = 'e0000000-0000-0000-0000-00000000000a';
select lives_ok(
  $$delete from public.metas where id = 'e0000000-0000-0000-0000-00000000000a'$$,
  'Con los aportes movidos, la meta se elimina'
);
select is(
  (select count(*) from public.movimientos where meta_id = 'e0000000-0000-0000-0000-0000000000a2'),
  2::bigint,
  'Los 2 aportes ahora cuentan en la otra meta'
);

-- 5. Archivar no toca los aportes
update public.metas set archivada = true where id = 'e0000000-0000-0000-0000-0000000000a2';
select is(
  (select count(*) from public.movimientos where meta_id = 'e0000000-0000-0000-0000-0000000000a2'),
  2::bigint,
  'Archivar una meta conserva sus aportes'
);
reset role;

select * from finish();
rollback;
