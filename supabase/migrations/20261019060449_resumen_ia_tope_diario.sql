-- SaveWise · Resumen con IA: máximo 10 por día por persona, espera entre intentos y último resumen guardado.
-- La capa gratuita de Gemini es compartida (500 por día, 15 por minuto): con 10 diarios y 2 minutos entre
-- resúmenes, ni 30 personas la superan.
--
-- La tabla vive en el esquema private (sin acceso desde la API). Solo se toca con las funciones de abajo,
-- que sacan al usuario de la sesión (auth.uid()), así nadie puede reiniciar su contador.

create table private.uso_ia (
  user_id uuid primary key references auth.users (id) on delete cascade,
  fecha date not null,
  usados smallint not null default 0 check (usados between 0 and 10),
  ultimo_exito timestamptz,
  ultimo_error timestamptz,
  en_curso_desde timestamptz,
  texto text check (texto is null or char_length(texto) <= 1200)
);
alter table private.uso_ia enable row level security;
revoke all on private.uso_ia from public, anon, authenticated;

-- Segundos que faltan para poder pedir otro: 2 min tras un resumen, 15 s tras un error,
-- y 45 s mientras hay uno en curso (evita el doble toque).
create or replace function private.espera_ia(p_exito timestamptz, p_error timestamptz, p_en_curso timestamptz)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(0, ceil(extract(epoch from greatest(
    coalesce(p_exito, '-infinity'::timestamptz) + interval '2 minutes',
    coalesce(p_error, '-infinity'::timestamptz) + interval '15 seconds',
    coalesce(p_en_curso, '-infinity'::timestamptz) + interval '45 seconds',
    now()
  ) - now())))::integer;
$$;
revoke all on function private.espera_ia(timestamptz, timestamptz, timestamptz) from public, anon, authenticated;

-- Lo que muestra el Dashboard al abrirse: cuántos usó hoy, cuánto falta para el próximo y el último resumen de hoy.
create or replace function public.estado_resumen_ia()
returns table (usados integer, espera_segundos integer, texto text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(case when u.fecha = (now() at time zone 'America/Lima')::date then u.usados end, 0)::integer,
    coalesce(private.espera_ia(u.ultimo_exito, u.ultimo_error, u.en_curso_desde), 0),
    case when u.fecha = (now() at time zone 'America/Lima')::date then u.texto end
  from (select (select auth.uid()) as id) yo
  left join private.uso_ia u on u.user_id = yo.id;
$$;

-- Antes de llamar a Gemini: decide si se puede y marca el pedido en curso. Bloquea la fila para que
-- dos toques seguidos no pasen los dos.
create or replace function public.reservar_resumen_ia()
returns table (permitido boolean, motivo text, usados integer, espera_segundos integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_usuario uuid := auth.uid();
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v private.uso_ia%rowtype;
  v_espera integer;
begin
  if v_usuario is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;

  insert into private.uso_ia (user_id, fecha) values (v_usuario, v_hoy) on conflict (user_id) do nothing;
  select * into v from private.uso_ia where user_id = v_usuario for update;

  -- Nuevo día (hora de Lima): el contador vuelve a 0 y el resumen de ayer se olvida.
  if v.fecha < v_hoy then
    update private.uso_ia set fecha = v_hoy, usados = 0, texto = null where user_id = v_usuario
    returning * into v;
  end if;

  v_espera := private.espera_ia(v.ultimo_exito, v.ultimo_error, v.en_curso_desde);
  if v.usados >= 10 then
    return query select false, 'tope'::text, v.usados::integer, v_espera;
    return;
  end if;
  if v_espera > 0 then
    return query select false,
      case when v.en_curso_desde > now() - interval '45 seconds' then 'en_curso' else 'espera' end,
      v.usados::integer, v_espera;
    return;
  end if;

  update private.uso_ia set en_curso_desde = now() where user_id = v_usuario;
  return query select true, null::text, v.usados::integer, 0;
end;
$$;

-- Después de Gemini: con texto cuenta el resumen y lo guarda; sin texto (error) no gasta intento.
-- Solo actúa si antes hubo una reserva, así llamarla sola no cambia nada.
create or replace function public.terminar_resumen_ia(p_texto text)
returns table (usados integer, espera_segundos integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_usuario uuid := auth.uid();
  v private.uso_ia%rowtype;
begin
  if v_usuario is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if char_length(p_texto) > 1200 then
    raise exception 'Resumen demasiado largo' using errcode = '22001';
  end if;

  update private.uso_ia u set
    usados = case when p_texto is null then u.usados else least(u.usados + 1, 10) end,
    texto = coalesce(p_texto, u.texto),
    ultimo_exito = case when p_texto is null then u.ultimo_exito else now() end,
    ultimo_error = case when p_texto is null then now() else u.ultimo_error end,
    en_curso_desde = null
  where u.user_id = v_usuario and u.en_curso_desde is not null
  returning * into v;
  if not found then
    select * into v from private.uso_ia where user_id = v_usuario;
  end if;

  return query select coalesce(v.usados, 0)::integer,
    coalesce(private.espera_ia(v.ultimo_exito, v.ultimo_error, v.en_curso_desde), 0);
end;
$$;

-- "Borrar todos mis datos" olvida el resumen guardado, pero no reinicia el contador del día.
create or replace function public.olvidar_resumen_ia()
returns void
language sql
security definer
set search_path = ''
as $$
  update private.uso_ia set texto = null where user_id = (select auth.uid());
$$;

revoke execute on function public.estado_resumen_ia() from public, anon;
revoke execute on function public.reservar_resumen_ia() from public, anon;
revoke execute on function public.terminar_resumen_ia(text) from public, anon;
revoke execute on function public.olvidar_resumen_ia() from public, anon;
grant execute on function public.estado_resumen_ia() to authenticated;
grant execute on function public.reservar_resumen_ia() to authenticated;
grant execute on function public.terminar_resumen_ia(text) to authenticated;
grant execute on function public.olvidar_resumen_ia() to authenticated;
