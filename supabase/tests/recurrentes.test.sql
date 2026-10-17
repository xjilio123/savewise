-- Pruebas de la Fase 4 (pgTAP): gastos recurrentes automáticos.
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

-- A: Spotify mensual pagado hace un mes y 3 días (le toca repetirse).
-- A: Netflix marcado mensual antes, pero el más reciente YA NO se repite (serie detenida).
-- B: un gasto normal, no recurrente.
insert into public.movimientos (user_id, tipo, concepto, monto, fecha, recurrente, creado) values
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Spotify', 8.22,
     ((now() at time zone 'America/Lima')::date - interval '1 month' - interval '3 days')::date, true, now()),
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Netflix', 30,
     ((now() at time zone 'America/Lima')::date - interval '3 months')::date, true, now() - interval '3 months'),
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Netflix', 30,
     ((now() at time zone 'America/Lima')::date - interval '2 months')::date, false, now() - interval '2 months'),
  ('00000000-0000-0000-0000-00000000000b', 'GASTO', 'Mercado', 50,
     ((now() at time zone 'America/Lima')::date - interval '2 months')::date, false, now());

set local role anon;
select throws_ok(
  $$select public.generar_recurrentes('secreto-falso')$$,
  'P0001', 'No autorizado',
  'Generar recurrentes exige el secreto del cron'
);
select is(public.generar_recurrentes('secreto-cron-de-prueba'), 1, 'Se generó exactamente un movimiento');
select is(public.generar_recurrentes('secreto-cron-de-prueba'), 0, 'Correr el cron dos veces no duplica nada');
reset role;

select is(
  (select count(*) from public.movimientos where user_id = '00000000-0000-0000-0000-00000000000a' and concepto = 'Spotify'),
  2::bigint,
  'Spotify se registró para este mes'
);
select is(
  (select nota from public.movimientos
   where concepto = 'Spotify' order by fecha desc limit 1),
  'Registrado automáticamente',
  'El movimiento automático queda identificado'
);
select is(
  (select count(*) from public.movimientos where concepto = 'Netflix'),
  2::bigint,
  'Una serie detenida en su último movimiento no se repite'
);
select is(
  (select count(*) from public.movimientos where user_id = '00000000-0000-0000-0000-00000000000b'),
  1::bigint,
  'Los movimientos no recurrentes no se tocan'
);

select * from finish();
rollback;
