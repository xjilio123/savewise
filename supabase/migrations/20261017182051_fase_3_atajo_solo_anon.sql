-- El Atajo solo se usa desde /api/atajo (rol anon + token). Los usuarios con sesión no lo necesitan.
revoke execute on function public.registrar_por_atajo(text, numeric, text, text, text) from authenticated;
