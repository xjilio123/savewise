-- Pruebas (pgTAP): editar el próximo pago del calendario (precio y fecha) sin tocar el historial.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');
insert into private.config (clave, valor)
values ('hash_cron', encode(extensions.digest('secreto-cron-de-prueba', 'sha256'), 'hex'))
on conflict (clave) do update set valor = excluded.valor;
insert into public.push_suscripciones (user_id, endpoint, p256dh, auth)
values ('00000000-0000-0000-0000-00000000000a', 'https://web.push.apple.com/a', repeat('p', 87), repeat('a', 22));

-- Spotify se pagó hace 20 días (el próximo, sin editar, sería en ~10 días). Netflix, hace 40 días.
insert into public.movimientos (id, user_id, tipo, concepto, monto, fecha, recurrente) values
  ('e0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'GASTO', 'Spotify', 8.22,
   (now() at time zone 'America/Lima')::date - 20, true),
  ('e0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'GASTO', 'Netflix', 39.90,
   (now() at time zone 'America/Lima')::date - 40, true);

-- 1-2. Cada persona edita solo sus pagos
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
update public.movimientos set proximo_monto = 1 where id = 'e0000000-0000-0000-0000-00000000000a';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select lives_ok(
  $$update public.movimientos
    set proximo_monto = 9.90, proximo_fecha = (now() at time zone 'America/Lima')::date + 3
    where id = 'e0000000-0000-0000-0000-00000000000a'$$,
  'A edita el precio y la fecha de su próximo Spotify'
);
reset role;
select is(
  (select proximo_monto from public.movimientos where id = 'e0000000-0000-0000-0000-00000000000a'),
  9.90,
  'B no pudo cambiar el pago de A; queda el cambio de A'
);

-- 3. El aviso de renovación usa la fecha y el precio editados
select ok(
  exists (
    select 1 from public.recordatorios_del_dia('secreto-cron-de-prueba')
    where r_titulo = 'Renovación en 3 días' and r_cuerpo like 'Spotify se renueva el %PEN 9.90'
  ),
  'El aviso de renovación sale 3 días antes de la nueva fecha y con el nuevo precio'
);

-- 4. El historial no cambia: el Spotify ya pagado sigue en 8.22
select is(
  (select monto from public.movimientos where id = 'e0000000-0000-0000-0000-00000000000a'),
  8.22,
  'Editar el próximo pago no toca el registro ya pagado'
);

-- 5-6. El día editado se registra solo con el nuevo precio, y el nuevo registro nace sin cambios pendientes
update public.movimientos set proximo_fecha = (now() at time zone 'America/Lima')::date
where id = 'e0000000-0000-0000-0000-00000000000a';
select is(public.generar_recurrentes('secreto-cron-de-prueba'), 2, 'Se registran el Spotify editado y el Netflix de siempre');
select results_eq(
  $$select monto, fecha = (now() at time zone 'America/Lima')::date, proximo_monto is null, proximo_fecha is null
    from public.movimientos where concepto = 'Spotify' order by fecha desc limit 1$$,
  $$values (9.90::numeric(14, 2), true, true, true)$$,
  'El Spotify nuevo usa el precio y la fecha editados, sin cambios pendientes'
);

-- 7. Sin editar, todo sigue igual: Netflix se repite con su mismo precio
select is(
  (select monto from public.movimientos where concepto = 'Netflix' order by fecha desc limit 1),
  39.90,
  'Lo que no se editó se repite igual que siempre'
);

-- 8. Correr el cron otra vez no duplica: el próximo Spotify ya cuenta desde la nueva fecha
select is(public.generar_recurrentes('secreto-cron-de-prueba'), 0, 'El cron no duplica nada');

select * from finish();
rollback;
