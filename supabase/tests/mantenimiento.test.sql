-- Pruebas de mantenimiento (pgTAP): índices de llaves compuestas y aviso mensual de respaldo.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- 1-4. Cada llave foránea compuesta tiene un índice que la cubre
select has_index('public', 'movimientos', 'movimientos_categoria_user_idx', array['categoria_id', 'user_id'], 'Índice (categoria_id, user_id)');
select has_index('public', 'movimientos', 'movimientos_meta_user_idx', array['meta_id', 'user_id'], 'Índice (meta_id, user_id)');
select has_index('public', 'movimientos', 'movimientos_deuda_user_idx', array['deuda_id', 'user_id'], 'Índice (deuda_id, user_id)');
select has_index('public', 'push_suscripciones', 'push_suscripciones_user_idx', array['user_id'], 'Índice push_suscripciones(user_id)');

-- Preparación: A con avisos activados
insert into private.correos_permitidos (email) values ('a@prueba.local');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local');
insert into private.config (clave, valor)
values ('hash_cron', encode(extensions.digest('secreto-cron-de-prueba', 'sha256'), 'hex'))
on conflict (clave) do update set valor = excluded.valor;
insert into public.push_suscripciones (user_id, endpoint, p256dh, auth)
values ('00000000-0000-0000-0000-00000000000a', 'https://web.push.apple.com/prueba', repeat('p', 87), repeat('a', 22));

-- 5. El aviso de respaldo llega solo el día 1 de cada mes (hora de Lima)
select is(
  (select count(*) from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = 'Respaldo mensual'),
  case when extract(day from (now() at time zone 'America/Lima')::date) = 1 then 1::bigint else 0::bigint end,
  'Aviso de respaldo solo el día 1'
);

-- 6. El aviso de respaldo abre Ajustes, una ruta interna
select is(
  (select coalesce(max(r_url), '/ajustes') from public.recordatorios_del_dia('secreto-cron-de-prueba') where r_titulo = 'Respaldo mensual'),
  '/ajustes',
  'El aviso de respaldo abre Ajustes'
);

select * from finish();
rollback;
