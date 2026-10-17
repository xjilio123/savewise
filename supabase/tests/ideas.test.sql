-- Pruebas de las ideas pequeñas (pgTAP): recordatorio "ayer no registraste nada" y reto de 52 semanas.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into private.correos_permitidos (email) values ('a@prueba.local'), ('c@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@prueba.local');
insert into private.config (clave, valor)
values ('hash_cron', encode(extensions.digest('secreto-cron-de-prueba', 'sha256'), 'hex'))
on conflict (clave) do update set valor = excluded.valor;
-- A y C tienen avisos activados; solo A ya usa la app (un gasto de hace 3 días, registrado hace 3 días).
insert into public.push_suscripciones (user_id, endpoint, p256dh, auth) values
  ('00000000-0000-0000-0000-00000000000a', 'https://web.push.apple.com/a', repeat('p', 87), repeat('a', 22)),
  ('00000000-0000-0000-0000-00000000000c', 'https://web.push.apple.com/c', repeat('p', 87), repeat('a', 22));
insert into public.movimientos (user_id, tipo, concepto, monto, fecha, creado) values
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Mercado', 20,
   (now() at time zone 'America/Lima')::date - 3, now() - interval '3 days');

-- 1. A no registró nada ayer: recibe el recordatorio
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba')
   where r_titulo = '¿Se te pasó algo ayer?' and r_endpoint = 'https://web.push.apple.com/a'),
  1::bigint,
  'Avisa cuando ayer no hubo movimientos'
);

-- 2. C nunca usó la app: no se le molesta
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba')
   where r_titulo = '¿Se te pasó algo ayer?' and r_endpoint = 'https://web.push.apple.com/c'),
  0::bigint,
  'No avisa a quien todavía no registra nada'
);

-- 3. Con un gasto de ayer, ya no hay recordatorio
insert into public.movimientos (user_id, tipo, concepto, monto, fecha)
values ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Pasaje', 3.5, (now() at time zone 'America/Lima')::date - 1);
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = '¿Se te pasó algo ayer?'),
  0::bigint,
  'Si ayer registraste algo, no hay recordatorio'
);

-- 4-5. El reto de 52 semanas acepta montos base razonables y rechaza los absurdos
select lives_ok(
  $$insert into public.metas (user_id, nombre, objetivo, reto_base)
    values ('00000000-0000-0000-0000-00000000000a', 'Reto 52 semanas', 2756, 2)$$,
  'Reto con monto base de 2'
);
select throws_ok(
  $$insert into public.metas (user_id, nombre, objetivo, reto_base)
    values ('00000000-0000-0000-0000-00000000000a', 'Reto raro', 1, 0)$$,
  '23514', null,
  'La base rechaza un monto base de 0'
);

select * from finish();
rollback;
