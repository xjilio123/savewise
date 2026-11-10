-- Pruebas (pgTAP): Tus datos. Espacio por persona, último respaldo, avisos y panel del dueño.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');
insert into private.config (clave, valor)
values ('hash_cron', encode(extensions.digest('secreto-cron-de-prueba', 'sha256'), 'hex'))
on conflict (clave) do update set valor = excluded.valor;
insert into public.push_suscripciones (user_id, endpoint, p256dh, auth)
values ('00000000-0000-0000-0000-00000000000a', 'https://web.push.apple.com/prueba-a', repeat('p', 87), repeat('a', 22));
insert into public.metas (id, user_id, nombre, objetivo) values
  ('e0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Navidad', 500);
insert into public.movimientos (user_id, tipo, concepto, monto, meta_id) values
  ('00000000-0000-0000-0000-00000000000a', 'INGRESO', 'Sueldo', 1500, null),
  ('00000000-0000-0000-0000-00000000000a', 'AHORRO', 'Aporte', 100, 'e0000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b', 'INGRESO', 'Sueldo B', 900, null),
  ('00000000-0000-0000-0000-00000000000b', 'INGRESO', 'Extra B', 50, null),
  ('00000000-0000-0000-0000-00000000000b', 'INGRESO', 'Otro B', 10, null);

-- 1. anon no puede medir el espacio
set local role anon;
select throws_ok($$select * from public.mi_espacio()$$, '42501', null, 'anon no puede usar mi_espacio');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 2-4. Cada persona ve solo lo suyo
select is((select movimientos from public.mi_espacio()), 2, 'Cuenta solo los movimientos propios');
select is((select metas from public.mi_espacio()), 1, 'Cuenta solo las metas propias');
select ok((select bytes from public.mi_espacio()) > 0, 'El espacio propio es mayor que 0');

-- 5. La medición de todas las personas no se puede llamar desde la API
select throws_ok($$select * from private.espacio_por_persona()$$, '42501', null, 'No se puede medir a otras personas');

-- 6. Quien no es dueño no ve el total de la base
select is((select count(*) from public.espacio_app()), 0::bigint, 'El total de la base no se muestra a cualquiera');

-- 7. El último respaldo se guarda y se lee
update public.perfiles set ultimo_respaldo = now() where id = '00000000-0000-0000-0000-00000000000a';
select ok((select ultimo_respaldo from public.mi_espacio()) is not null, 'Se guarda la fecha del último respaldo');

-- 8. No se puede cambiar el último respaldo de otra persona
update public.perfiles set ultimo_respaldo = now() where id = '00000000-0000-0000-0000-00000000000b';
reset role;
select is(
  (select ultimo_respaldo from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'),
  null,
  'No se toca el perfil de otra persona'
);

-- 9. Con un respaldo reciente no llega el aviso mensual (sea el día que sea)
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = 'Respaldo mensual'),
  0::bigint,
  'Sin aviso de respaldo si descargaste uno hace menos de 30 días'
);

-- 10. Con un respaldo viejo, el aviso llega el día 1
update public.perfiles set ultimo_respaldo = now() - interval '45 days' where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = 'Respaldo mensual'),
  case when extract(day from (now() at time zone 'America/Lima')::date) = 1 then 1::bigint else 0::bigint end,
  'Con 45 días sin respaldo, el aviso llega el día 1'
);

-- 11. Lejos del 90%, no hay aviso de espacio y la marca de aviso se limpia
update public.perfiles set espacio_avisado = now() where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = 'Tu espacio está casi lleno'),
  0::bigint,
  'Sin aviso de espacio lleno con poco uso'
);
select is(
  (select espacio_avisado from public.perfiles where id = '00000000-0000-0000-0000-00000000000a'),
  null,
  'Si el uso baja del 90%, se puede volver a avisar'
);

-- 13. El dueño sí ve el total de la base y cuántas personas hay
insert into private.duenos (user_id) values ('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select ok(
  (select personas >= 2 and bytes > 0 from public.espacio_app()),
  'El dueño ve el total de la base'
);
reset role;

select * from finish();
rollback;
