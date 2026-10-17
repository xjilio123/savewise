-- SaveWise · Fase 3 (parte 6): defensa en profundidad, retirar permisos que no se usan.
revoke all on public.push_suscripciones, public.tokens_atajo from anon;
revoke update on public.push_suscripciones, public.tokens_atajo from authenticated;
revoke all on function private.cron_autorizado(text) from public, anon, authenticated;
revoke execute on function public.recordatorios_del_dia(text) from public, authenticated;
revoke execute on function public.registrar_por_atajo(text, numeric, text, text, text) from public;
