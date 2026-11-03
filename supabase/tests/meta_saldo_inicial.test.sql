-- Pruebas (pgTAP): saldo inicial de una meta (lo que ya tenías ahorrado al crearla).
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');
insert into public.metas (id, user_id, nombre, objetivo, saldo_inicial) values
  ('e0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Meta de B', 1000, 300);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 1. Sin saldo inicial, la meta empieza en 0
insert into public.metas (id, nombre, objetivo) values ('e0000000-0000-0000-0000-00000000000a', 'Navidad', 500);
select is(
  (select saldo_inicial from public.metas where id = 'e0000000-0000-0000-0000-00000000000a'),
  0::numeric,
  'Una meta nueva empieza con saldo inicial 0'
);

-- 2. Con saldo inicial
select lives_ok(
  $$insert into public.metas (nombre, objetivo, saldo_inicial) values ('Viaje', 5000, 2000)$$,
  'Se puede crear una meta con lo que ya tenías ahorrado'
);

-- 3. No puede ser negativo
select throws_ok(
  $$insert into public.metas (nombre, objetivo, saldo_inicial) values ('Mal', 500, -1)$$,
  '23514', null,
  'El saldo inicial no puede ser negativo'
);

-- 4. No puede superar el objetivo
select throws_ok(
  $$insert into public.metas (nombre, objetivo, saldo_inicial) values ('Mal 2', 500, 500.01)$$,
  '23514', null,
  'El saldo inicial no puede superar el objetivo'
);

-- 5. Se puede corregir después
update public.metas set saldo_inicial = 120.50 where id = 'e0000000-0000-0000-0000-00000000000a';
select is(
  (select saldo_inicial from public.metas where id = 'e0000000-0000-0000-0000-00000000000a'),
  120.50::numeric,
  'El saldo inicial se puede editar'
);

-- 6. Bajar el objetivo por debajo del saldo inicial no se permite
select throws_ok(
  $$update public.metas set objetivo = 100 where id = 'e0000000-0000-0000-0000-00000000000a'$$,
  '23514', null,
  'El objetivo no puede quedar por debajo del saldo inicial'
);

-- 7. RLS: no se ve ni se cambia el saldo de otra persona
update public.metas set saldo_inicial = 0 where id = 'e0000000-0000-0000-0000-00000000000b';
reset role;
select is(
  (select saldo_inicial from public.metas where id = 'e0000000-0000-0000-0000-00000000000b'),
  300::numeric,
  'No se puede cambiar el saldo inicial de una meta ajena'
);

select * from finish();
rollback;
