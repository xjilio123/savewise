-- SaveWise · Fase 3 (parte 4): permisos de ejecución mínimos.
-- El Atajo y el cron llaman con la clave pública (rol anon); cada función exige su secreto.
grant execute on function public.registrar_por_atajo(text, numeric, text, text, text) to anon, authenticated;
grant execute on function public.recordatorios_del_dia(text) to anon;
