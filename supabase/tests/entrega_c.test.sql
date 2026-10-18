-- Pruebas (pgTAP): "Me deben", resumen del periodo y "¿Sigues usando…?".
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');
insert into private.config (clave, valor)
values ('hash_cron', encode(extensions.digest('secreto-cron-de-prueba', 'sha256'), 'hex'))
on conflict (clave) do update set valor = excluded.valor;
insert into public.push_suscripciones (user_id, endpoint, p256dh, auth)
values ('00000000-0000-0000-0000-00000000000a', 'https://web.push.apple.com/a', repeat('p', 87), repeat('a', 22));

-- A cobra hoy: su periodo anterior terminó ayer.
update public.perfiles set dia_pago = extract(day from (now() at time zone 'America/Lima')::date)::smallint, sueldo_mensual = 1500
where id = '00000000-0000-0000-0000-00000000000a';
insert into public.movimientos (user_id, tipo, concepto, monto, fecha, categoria_id)
select '00000000-0000-0000-0000-00000000000a', 'GASTO', 'Mercado', 80, (now() at time zone 'America/Lima')::date - 1, id
from public.categorias where user_id = '00000000-0000-0000-0000-00000000000a' and nombre = 'Alimentación';

-- Netflix pagado 3 veces (cada mes); la próxima renovación es en 3 días.
insert into public.movimientos (user_id, tipo, concepto, monto, fecha, recurrente) values
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Netflix', 39.9, ((now() at time zone 'America/Lima')::date + 3 - interval '3 months')::date, true),
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Netflix', 39.9, ((now() at time zone 'America/Lima')::date + 3 - interval '2 months')::date, true),
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Netflix', 39.9, ((now() at time zone 'America/Lima')::date + 3 - interval '1 month')::date, true);

-- 1. Resumen del periodo el día de cobro
select is(
  (select r_cuerpo from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = 'Tu resumen del periodo'),
  'Gastaste PEN 119.90 y ahorraste PEN 0.00. Donde más gastaste: Alimentación.',
  'Resumen con gastos (Mercado + último Netflix), ahorros y la categoría principal'
);

-- 2. A la tercera renovación pregunta si se sigue usando. Algunos días (p. ej. 31 tras un mes de 30)
-- no existe una fecha "un mes antes" que renueve exactamente en 3 días: ahí la prueba se salta.
select case
  when ((((now() at time zone 'America/Lima')::date + 3) - interval '1 month') + interval '1 month')::date
       = (now() at time zone 'America/Lima')::date + 3
  then is(
    (select r_url from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = '¿Sigues usando Netflix?'),
    '/dashboard',
    'Cada 3 renovaciones pregunta y lleva al calendario'
  )
  else skip('Hoy no hay fecha de renovación exacta en 3 días', 1)
end;

-- 3-7. Me deben: cada persona ve y cambia solo sus préstamos
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.prestamos (id, persona, monto) values ('f0000000-0000-0000-0000-00000000000a', 'Carlos', 50)$$,
  'A registra un préstamo'
);
select throws_ok(
  $$insert into public.prestamos (user_id, persona, monto) values ('00000000-0000-0000-0000-00000000000b', 'Intruso', 1)$$,
  '42501', null,
  'RLS impide crear préstamos para otra persona'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*) from public.prestamos), 0::bigint, 'B no ve los préstamos de A');
update public.prestamos set cobrado = true where id = 'f0000000-0000-0000-0000-00000000000a';
reset role;
select is(
  (select cobrado from public.prestamos where id = 'f0000000-0000-0000-0000-00000000000a'),
  false,
  'B no puede marcar como cobrado un préstamo de A'
);
set local role anon;
select throws_ok($$select count(*) from public.prestamos$$, '42501', null, 'anon no tiene acceso a préstamos');
reset role;

select * from finish();
rollback;
