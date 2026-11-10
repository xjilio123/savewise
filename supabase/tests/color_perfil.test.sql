-- Pruebas (pgTAP): color del círculo de perfil.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');

-- 1. Una cuenta nueva empieza en "Original" (sin color)
select is(
  (select color_perfil from public.perfiles where id = '00000000-0000-0000-0000-00000000000a'),
  null,
  'Sin color elegido se usa el degradado de siempre'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 2. Cada persona cambia el suyo
update public.perfiles set color_perfil = 'verde' where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select color_perfil::text from public.perfiles where id = '00000000-0000-0000-0000-00000000000a'),
  'verde',
  'Se guarda el color propio'
);

-- 3. El gris no se puede elegir
select throws_ok(
  $$update public.perfiles set color_perfil = 'gris' where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null,
  'El gris queda para Sin categoría'
);

-- 4. Volver a Original
update public.perfiles set color_perfil = null where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select color_perfil from public.perfiles where id = '00000000-0000-0000-0000-00000000000a'),
  null,
  'Se puede volver a Original'
);

-- 5. No se puede cambiar el color de otra persona
update public.perfiles set color_perfil = 'rojo' where id = '00000000-0000-0000-0000-00000000000b';
reset role;
select is(
  (select color_perfil from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'),
  null,
  'No se toca el color de otra persona'
);

select * from finish();
rollback;
