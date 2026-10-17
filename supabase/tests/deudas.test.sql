-- Pruebas de la Fase 5c (pgTAP): deudas y tarjetas.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');
insert into private.config (clave, valor)
values ('hash_cron', encode(extensions.digest('secreto-cron-de-prueba', 'sha256'), 'hex'))
on conflict (clave) do update set valor = excluded.valor;
insert into public.push_suscripciones (user_id, endpoint, p256dh, auth)
values ('00000000-0000-0000-0000-00000000000a', 'https://web.push.apple.com/prueba', repeat('p', 87), repeat('a', 22));

-- A: Visa (se paga mañana) y un préstamo ya cerrado que también "vencería" mañana. B: un préstamo.
insert into public.deudas (id, user_id, nombre, tipo, monto_total, cuota_mensual, dia_pago, tea, cerrada) values
  ('d0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Visa', 'tarjeta', 2500, 250,
     extract(day from (now() at time zone 'America/Lima')::date + 1)::smallint, 65, false),
  ('d0000000-0000-0000-0000-0000000000c0', '00000000-0000-0000-0000-00000000000a', 'Préstamo viejo', 'prestamo', 1000, 100,
     extract(day from (now() at time zone 'America/Lima')::date + 1)::smallint, null, true),
  ('d0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Préstamo B', 'prestamo', 5000, 500,
     10, 20, false);

-- Pagos recurrentes de hace un mes: uno de la Visa (debe repetirse) y otro del préstamo cerrado (no).
insert into public.movimientos (user_id, tipo, concepto, monto, fecha, recurrente, deuda_id) values
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Pago Visa', 250,
     ((now() at time zone 'America/Lima')::date - interval '1 month' - interval '1 day')::date, true,
     'd0000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Pago préstamo viejo', 100,
     ((now() at time zone 'America/Lima')::date - interval '1 month' - interval '1 day')::date, true,
     'd0000000-0000-0000-0000-0000000000c0');

-- ---------- Como A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 1. A solo ve sus deudas
select is((select count(*) from public.deudas), 2::bigint, 'A ve solo sus 2 deudas');

-- 2. A no puede crear una deuda a nombre de B
select throws_ok(
  $$insert into public.deudas (user_id, nombre, monto_total) values ('00000000-0000-0000-0000-00000000000b', 'Intrusa', 10)$$,
  '42501', null,
  'RLS impide crear deudas para otra persona'
);

-- 3. A no puede vincular un pago a la deuda de B
select throws_ok(
  $$insert into public.movimientos (user_id, tipo, concepto, monto, deuda_id)
    values ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Truco', 1, 'd0000000-0000-0000-0000-00000000000b')$$,
  '23503', null,
  'La llave compuesta impide pagar la deuda de otra persona'
);

-- 4. A no puede modificar ni borrar la deuda de B (RLS la oculta)
update public.deudas set monto_total = 1 where id = 'd0000000-0000-0000-0000-00000000000b';
delete from public.deudas where id = 'd0000000-0000-0000-0000-00000000000b';

-- 5. La base rechaza un día de pago imposible
select throws_ok(
  $$insert into public.deudas (nombre, monto_total, dia_pago) values ('Rara', 10, 40)$$,
  '23514', null,
  'La base rechaza días de pago fuera de 1..31'
);
reset role;

select is(
  (select monto_total from public.deudas where id = 'd0000000-0000-0000-0000-00000000000b'),
  5000.00::numeric,
  'La deuda de B sigue intacta tras el intento de A'
);

-- 6. Sin sesión no se puede leer ninguna deuda
set local role anon;
select throws_ok($$select count(*) from public.deudas$$, '42501', null, 'anon no tiene acceso a deudas');
reset role;

-- 7-8. Aviso un día antes del pago, solo para deudas abiertas
select is(
  (select r_cuerpo from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = 'Mañana pagas Visa'),
  'Cuota de PEN 250.00.',
  'Avisa un día antes del pago de la Visa con su cuota'
);
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = 'Mañana pagas Préstamo viejo'),
  0::bigint,
  'Una deuda cerrada ya no genera avisos'
);

-- 9-10. El pago recurrente sigue vinculado a su deuda; el de una deuda cerrada no se repite
select is(public.generar_recurrentes('secreto-cron-de-prueba'), 1, 'Solo se repite el pago de la deuda abierta');
select is(
  (select count(*) from public.movimientos where deuda_id = 'd0000000-0000-0000-0000-00000000000a'),
  2::bigint,
  'La copia automática conserva el vínculo con la Visa'
);

-- 11-12. Eliminar una deuda conserva sus pagos como gastos normales
delete from public.deudas where id = 'd0000000-0000-0000-0000-00000000000a';
select is(
  (select count(*) from public.movimientos where concepto = 'Pago Visa' and deuda_id is null),
  2::bigint,
  'Los pagos quedan como gastos sin deuda'
);
select is(
  (select count(*) from public.movimientos where user_id = '00000000-0000-0000-0000-00000000000a'),
  3::bigint,
  'No se borró ningún movimiento'
);

select * from finish();
rollback;
