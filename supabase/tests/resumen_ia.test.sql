-- Pruebas (pgTAP): tope diario del resumen con IA, esperas entre intentos y resumen guardado.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

insert into private.correos_permitidos (email) values ('a@prueba.local'), ('b@prueba.local');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.local');

-- 1. Sin sesión no se puede pedir
set local role anon;
select throws_ok($$select * from public.reservar_resumen_ia()$$, '42501', null, 'anon no puede pedir resúmenes');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 2-3. Primer pedido permitido; un segundo toque mientras está en curso no pasa
select is((select permitido from public.reservar_resumen_ia()), true, 'El primer resumen del día está permitido');
select is((select motivo from public.reservar_resumen_ia()), 'en_curso', 'Un doble toque no lanza otro pedido');

-- 4-6. Un resumen exitoso cuenta, se guarda y obliga a esperar 2 minutos
select is((select usados from public.terminar_resumen_ia('Vas bien este mes.')), 1, 'El resumen exitoso cuenta 1');
select results_eq(
  $$select usados, texto, espera_segundos between 100 and 120 from public.estado_resumen_ia()$$,
  $$values (1, 'Vas bien este mes.', true)$$,
  'El Dashboard ve 1 usado, el resumen guardado y la espera de ~2 minutos'
);
select is((select motivo from public.reservar_resumen_ia()), 'espera', 'Antes de 2 minutos no deja pedir otro');

-- 7-8. Un error no gasta intento y solo obliga a esperar 15 segundos
reset role;
update private.uso_ia set ultimo_exito = now() - interval '3 minutes' where user_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select is((select permitido from public.reservar_resumen_ia()), true, 'Pasados 2 minutos deja pedir otro');
select results_eq(
  $$select usados, espera_segundos between 1 and 15 from public.terminar_resumen_ia(null)$$,
  $$values (1, true)$$,
  'Si la IA falla no se gasta el intento y la espera es de 15 segundos'
);

-- 9. Llamar a "terminar" sin reservar no suma ni cambia nada
select is((select usados from public.terminar_resumen_ia('Texto inventado')), 1, 'Terminar sin reserva no cambia el contador');

-- 10. Al llegar a 10 se bloquea hasta mañana
reset role;
update private.uso_ia set usados = 10, ultimo_exito = null, ultimo_error = null
where user_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select is((select motivo from public.reservar_resumen_ia()), 'tope', 'Con 10 resúmenes hoy ya no deja pedir más');

-- 11-12. Otra persona no ve el resumen ni el contador de A, y su "terminar" sin reserva no hace nada
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select results_eq(
  $$select usados, texto from public.estado_resumen_ia()$$,
  $$values (0, null::text)$$,
  'B no ve el resumen ni el contador de A'
);
select is((select usados from public.terminar_resumen_ia('x')), 0, 'B no puede sumarse resúmenes sin reservar');

-- 13. Nadie puede leer ni tocar la tabla directamente (por ejemplo, para reiniciar su contador)
select throws_ok($$select * from private.uso_ia$$, '42501', null, 'La tabla del contador no es accesible desde la API');

-- 14-15. Al día siguiente (hora de Lima) el contador vuelve a 0 y el resumen de ayer se olvida
reset role;
update private.uso_ia set fecha = fecha - 1 where user_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select results_eq(
  $$select usados, texto from public.estado_resumen_ia()$$,
  $$values (0, null::text)$$,
  'Un nuevo día muestra 0 usados y sin resumen viejo'
);
select results_eq(
  $$select permitido, usados from public.reservar_resumen_ia()$$,
  $$values (true, 0)$$,
  'Un nuevo día vuelve a permitir resúmenes desde 0'
);

-- 16. Borrar mis datos olvida el resumen guardado sin reiniciar el contador
select public.terminar_resumen_ia('Resumen de hoy');
select public.olvidar_resumen_ia();
select results_eq(
  $$select usados, texto from public.estado_resumen_ia()$$,
  $$values (1, null::text)$$,
  'Olvidar borra el texto pero el contador sigue en 1'
);
reset role;

select * from finish();
rollback;
