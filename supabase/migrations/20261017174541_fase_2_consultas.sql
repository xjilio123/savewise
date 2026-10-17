-- =========================================================
-- SaveWise · Fase 2: funciones de consulta
-- Todas son SECURITY INVOKER: corren con los permisos de quien llama, así que RLS
-- sigue decidiendo qué filas ve cada usuario.
-- =========================================================

-- Por defecto, ninguna función nueva del esquema public es ejecutable por anon.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- Totales del filtro del Historial, agrupados por tipo.
create or replace function public.resumen_filtrado(
  p_desde date,
  p_hasta date,
  p_tipo public.tipo_movimiento default null,
  p_categoria uuid default null,
  p_texto text default null
)
returns table (tipo public.tipo_movimiento, total numeric, cantidad bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.tipo, sum(m.monto_base), count(*)
  from public.movimientos m
  where m.fecha between p_desde and p_hasta
    and (p_tipo is null or m.tipo = p_tipo)
    and (p_categoria is null or m.categoria_id = p_categoria)
    and (
      p_texto is null
      or m.concepto ilike '%' || replace(replace(replace(p_texto, '\', '\'), '%', '\%'), '_', '\_') || '%'
    )
  group by m.tipo;
$$;

-- Gastos (incluido el ocio de Para mí) por categoría en un rango de fechas.
create or replace function public.gastos_por_categoria(p_desde date, p_hasta date)
returns table (categoria_id uuid, nombre text, color public.color_app, total numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    coalesce(c.nombre, 'Sin categoría'),
    coalesce(c.color, 'negro'::public.color_app),
    sum(m.monto_base)
  from public.movimientos m
  left join public.categorias c on c.id = m.categoria_id
  where m.tipo in ('GASTO', 'OCIO')
    and m.fecha between p_desde and p_hasta
  group by c.id, c.nombre, c.color
  order by 4 desc;
$$;

-- Cambia la moneda base del usuario actual y convierte sus montos con un factor.
-- Solo toca filas propias (filtra por auth.uid() y además RLS lo impone).
create or replace function public.cambiar_moneda_base(p_nueva text, p_factor numeric)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then
    raise exception 'Sin sesión';
  end if;
  if p_nueva !~ '^[A-Z]{3}$' then
    raise exception 'Moneda inválida';
  end if;
  if p_factor is null or p_factor <= 0 or p_factor > 100000 then
    raise exception 'Factor inválido';
  end if;

  update public.movimientos set tipo_cambio = tipo_cambio * p_factor where user_id = v_usuario;
  update public.metas set objetivo = round(objetivo * p_factor, 2), moneda = p_nueva where user_id = v_usuario;
  update public.perfiles set moneda_base = p_nueva where id = v_usuario;
end;
$$;

-- Ping mínimo para el cron diario: mantiene activo el proyecto del plan gratis.
create or replace function public.ping()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$ select 1 $$;

-- ---------- Privilegios ----------
revoke execute on function public.resumen_filtrado(date, date, public.tipo_movimiento, uuid, text) from public, anon;
revoke execute on function public.gastos_por_categoria(date, date) from public, anon;
revoke execute on function public.cambiar_moneda_base(text, numeric) from public, anon;
grant execute on function public.resumen_filtrado(date, date, public.tipo_movimiento, uuid, text) to authenticated;
grant execute on function public.gastos_por_categoria(date, date) to authenticated;
grant execute on function public.cambiar_moneda_base(text, numeric) to authenticated;

revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
