-- Pruebas de las funciones de la Fase 2 (pgTAP). Se ejecutan con: supabase test db
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- ---------- Preparación (como superusuario) ----------
insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');

insert into public.movimientos (user_id, tipo, concepto, monto, fecha) values
  ('00000000-0000-0000-0000-00000000000a', 'GASTO', 'Mercado', 100, '2026-10-05'),
  ('00000000-0000-0000-0000-00000000000a', 'OCIO', 'Cine', 30, '2026-10-06'),
  ('00000000-0000-0000-0000-00000000000b', 'GASTO', 'Taxi', 10, '2026-10-05');

-- ---------- Como usuario B ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

-- 1. El resumen del Historial solo suma lo de B
select is(
  (select sum(total) from public.resumen_filtrado('2026-10-01', '2026-10-31')),
  10::numeric,
  'resumen_filtrado no mezcla datos de otros usuarios'
);

-- 2. Los gastos por categoría solo incluyen lo de B
select is(
  (select sum(total) from public.gastos_por_categoria('2026-10-01', '2026-10-31')),
  10::numeric,
  'gastos_por_categoria no mezcla datos de otros usuarios'
);

-- 3. Un "%" en la búsqueda se trata como texto literal, no como comodín
select is_empty(
  $$select * from public.resumen_filtrado('2026-10-01', '2026-10-31', null, null, '%')$$,
  'La búsqueda escapa los comodines de LIKE'
);

-- 4. Un factor de conversión inválido se rechaza
select throws_ok(
  $$select public.cambiar_moneda_base('USD', -1)$$,
  'P0001',
  'Factor inválido',
  'cambiar_moneda_base rechaza factores inválidos'
);

-- 5. B cambia su moneda base
select lives_ok($$select public.cambiar_moneda_base('USD', 2)$$, 'B puede cambiar su moneda base');

reset role;

-- 6-7. Como superusuario: B cambió y A quedó intacto
select is(
  (select moneda_base::text from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'),
  'USD',
  'La moneda base de B cambió'
);
select is(
  (select max(tipo_cambio) from public.movimientos where user_id = '00000000-0000-0000-0000-00000000000a'),
  1::numeric(18, 8),
  'Los movimientos de A no se convirtieron'
);

-- ---------- Visitante sin sesión ----------
set local role anon;

-- 8. anon no puede consultar resúmenes
select throws_ok(
  $$select * from public.resumen_filtrado('2026-10-01', '2026-10-31')$$,
  '42501',
  null,
  'anon no puede ejecutar resumen_filtrado'
);

-- 9. anon solo puede hacer ping (lo usa el cron para mantener activo el proyecto)
select is((select public.ping()), 1, 'anon puede hacer ping');

reset role;

select * from finish();
rollback;
