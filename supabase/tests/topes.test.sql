-- Pruebas de la Fase 5b (pgTAP): topes por categoría y su aviso al 80%.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

-- 1-4. El inicio del periodo en SQL coincide con periodoFinanciero de TypeScript
select is(private.inicio_periodo('2026-10-17', 1), '2026-10-01'::date, 'Día de pago 1: mes calendario');
select is(private.inicio_periodo('2026-10-17', 15), '2026-10-15'::date, 'Cobra el 15: el periodo empieza el 15');
select is(private.inicio_periodo('2026-10-10', 15), '2026-09-15'::date, 'Antes del día de pago sigue el periodo anterior');
select is(private.inicio_periodo('2026-02-10', 31), '2026-01-31'::date, 'Día 31 en meses cortos usa el último día');

-- Preparación: A con tope de 100 en Alimentación, 85 gastados hoy y avisos activos
insert into private.correos_permitidos (email) values ('a@prueba.local');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local');
insert into private.config (clave, valor)
values ('hash_cron', encode(extensions.digest('secreto-cron-de-prueba', 'sha256'), 'hex'))
on conflict (clave) do update set valor = excluded.valor;
insert into public.push_suscripciones (user_id, endpoint, p256dh, auth)
values ('00000000-0000-0000-0000-00000000000a', 'https://web.push.apple.com/prueba', repeat('p', 87), repeat('a', 22));
update public.categorias set tope = 100
where user_id = '00000000-0000-0000-0000-00000000000a' and nombre = 'Alimentación';
insert into public.movimientos (user_id, tipo, concepto, monto, fecha, categoria_id)
select '00000000-0000-0000-0000-00000000000a', 'GASTO', 'Mercado', 85, (now() at time zone 'America/Lima')::date, id
from public.categorias where user_id = '00000000-0000-0000-0000-00000000000a' and nombre = 'Alimentación';

-- 5. El cron avisa al pasar el 80%
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = 'Alimentación al 85% de su tope'),
  1::bigint,
  'Avisa al llegar al 85% del tope'
);

-- 6. No repite el aviso en el mismo periodo
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo like 'Alimentación%'),
  0::bigint,
  'El aviso del tope llega una sola vez por periodo'
);

-- 7. Un tope inválido se rechaza en la base
select throws_ok(
  $$update public.categorias set tope = -5 where user_id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514',
  null,
  'La base rechaza topes negativos'
);

select * from finish();
rollback;
