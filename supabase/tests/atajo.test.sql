-- Pruebas de la Fase 3 (pgTAP): Atajo de Siri, recordatorios del cron y tablas nuevas.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

-- ---------- Preparación (como superusuario) ----------
insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');

insert into public.tokens_atajo (user_id, hash_token) values (
  '00000000-0000-0000-0000-00000000000a',
  encode(extensions.digest('token-de-prueba-de-A-0123456789abcdef', 'sha256'), 'hex')
);
insert into private.config (clave, valor)
values ('hash_cron', encode(extensions.digest('secreto-cron-de-prueba', 'sha256'), 'hex'))
on conflict (clave) do update set valor = excluded.valor;
-- A cobra 1500 desde el día 1: tiene dinero sin asignar para sus gastos.
update public.perfiles set sueldo_mensual = 1500, dia_pago = 1 where id = '00000000-0000-0000-0000-00000000000a';

-- ---------- Como visitante sin sesión (así llaman /api/atajo y el cron) ----------
set local role anon;

select throws_ok(
  $$select public.registrar_por_atajo('token-falso-0000000000000000000000000000', 10, 'Café')$$,
  'P0001', 'Token inválido',
  'Un token falso no registra nada'
);
select throws_ok(
  $$select public.registrar_por_atajo('corto', 10, 'Café')$$,
  'P0001', 'Token inválido',
  'Un token con formato inválido se rechaza'
);
select lives_ok(
  $$select public.registrar_por_atajo('token-de-prueba-de-A-0123456789abcdef', 12.5, 'Café', 'GASTO', 'ALIMENTACIÓN')$$,
  'El token válido registra el gasto'
);
select throws_ok(
  $$select public.registrar_por_atajo('token-de-prueba-de-A-0123456789abcdef', 1.234, 'Café')$$,
  'P0001', 'Monto inválido',
  'Montos con más de 2 decimales se rechazan'
);
select throws_ok(
  $$select public.registrar_por_atajo('token-de-prueba-de-A-0123456789abcdef', 10, 'Café', 'AHORRO')$$,
  'P0001', 'Tipo inválido',
  'El Atajo solo registra gastos, ocio o ingresos'
);
-- Un gasto no puede superar lo sin asignar (1500 − 12.50 del café = 1487.50); ocio e ingresos no se frenan
select throws_ok(
  $$select public.registrar_por_atajo('token-de-prueba-de-A-0123456789abcdef', 1500, 'Televisor')$$,
  'P0001', 'Sin dinero|PEN|1487.50',
  'Un gasto mayor a lo sin asignar se rechaza e informa lo disponible'
);
select lives_ok(
  $$select public.registrar_por_atajo('token-de-prueba-de-A-0123456789abcdef', 1487.5, 'Todo lo que queda')$$,
  'Se puede gastar hasta el último céntimo sin asignar'
);
select throws_ok(
  $$select public.registrar_por_atajo('token-de-prueba-de-A-0123456789abcdef', 1, 'Chicle')$$,
  'P0001', 'Sin dinero|PEN|0.00',
  'Sin dinero sin asignar no se puede registrar ningún gasto'
);
select throws_ok($$select * from public.tokens_atajo$$, '42501', null, 'anon no puede leer tokens');
select throws_ok($$select * from public.push_suscripciones$$, '42501', null, 'anon no puede leer suscripciones');
select throws_ok(
  $$select * from public.recordatorios_del_dia('secreto-falso')$$,
  'P0001', 'No autorizado',
  'Los recordatorios exigen el secreto del cron'
);
select lives_ok(
  $$select * from public.recordatorios_del_dia('secreto-cron-de-prueba')$$,
  'Con el secreto correcto, el cron obtiene los recordatorios'
);

reset role;

-- ---------- Verificaciones como superusuario ----------
select is(
  (select count(*) from public.movimientos where user_id = '00000000-0000-0000-0000-00000000000a' and concepto = 'Café'),
  1::bigint,
  'El gasto quedó a nombre del dueño del token'
);
select is(
  (select c.nombre from public.movimientos m join public.categorias c on c.id = m.categoria_id
   where m.user_id = '00000000-0000-0000-0000-00000000000a' and m.concepto = 'Café'),
  'Alimentación',
  'La categoría se busca por nombre sin importar mayúsculas'
);
select is(
  (select count(*) from public.movimientos where user_id = '00000000-0000-0000-0000-00000000000b'),
  0::bigint,
  'El usuario B no recibió nada'
);

-- Límite de 10 registros por minuto
update public.tokens_atajo set usos_ventana = 10, ventana_inicio = now() where user_id = '00000000-0000-0000-0000-00000000000a';
set local role anon;
select throws_ok(
  $$select public.registrar_por_atajo('token-de-prueba-de-A-0123456789abcdef', 5, 'Spam')$$,
  'P0001', 'Demasiados registros, espera un minuto',
  'El límite por minuto se aplica'
);
reset role;

-- B no ve el token de A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is_empty($$select * from public.tokens_atajo$$, 'B no ve el token de A');
reset role;

select * from finish();
rollback;
