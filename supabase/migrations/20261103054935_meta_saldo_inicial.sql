-- Saldo inicial de una meta: lo que ya tenías ahorrado para ella antes de usar la app.
-- No es un movimiento: no resta de "Sin asignar" ni cuenta como ahorro del mes; solo suma al avance.
-- Las metas que ya existen quedan en 0 (sin cambios).
alter table public.metas
  add column saldo_inicial numeric(14, 2) not null default 0,
  add constraint metas_saldo_inicial_valido check (saldo_inicial >= 0 and saldo_inicial <= objetivo);
