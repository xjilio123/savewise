-- SaveWise · Fase 3 (parte 7): el cron borra suscripciones que el servicio push dio por vencidas (404/410).
-- En producción se aplica desde el editor SQL de Supabase (el conector MCP no acepta DELETE en migraciones).
create or replace function public.eliminar_suscripcion_vencida(p_token text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.cron_autorizado(p_token) then
    raise exception 'No autorizado';
  end if;
  delete from public.push_suscripciones where endpoint = p_endpoint;
end;
$$;

revoke execute on function public.eliminar_suscripcion_vencida(text, text) from public, authenticated;
grant execute on function public.eliminar_suscripcion_vencida(text, text) to anon;
