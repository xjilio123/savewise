-- Cada categoría con su propio color (antes 9 categorías compartían 5 colores).

update public.categorias
set color = case nombre
  when 'Alimentación' then 'naranja'
  when 'Transporte' then 'azul'
  when 'Suscripciones' then 'rosa'
  when 'Servicios' then 'turquesa'
  when 'Ocio' then 'morado'
  when 'Salud' then 'rojo'
  when 'Educación' then 'indigo'
  when 'Ahorro' then 'verde'
  when 'Otros' then 'negro'
  else color
end::public.color_app;

-- Nunca dos categorías de la misma persona con el mismo color.
create unique index categorias_color_unico on public.categorias (user_id, color);

-- Categorías por defecto de las cuentas nuevas, ya con colores distintos.
create or replace function private.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80));

  insert into public.categorias (user_id, nombre, color, icono) values
    (new.id, 'Alimentación', 'naranja', 'cart'),
    (new.id, 'Transporte', 'azul', 'bus'),
    (new.id, 'Suscripciones', 'rosa', 'repeat'),
    (new.id, 'Servicios', 'turquesa', 'bolt'),
    (new.id, 'Ocio', 'morado', 'sparkles'),
    (new.id, 'Salud', 'rojo', 'heart'),
    (new.id, 'Educación', 'indigo', 'book'),
    (new.id, 'Ahorro', 'verde', 'piggy'),
    (new.id, 'Otros', 'negro', 'dots');
  return new;
end;
$$;
revoke all on function private.crear_perfil() from public, anon, authenticated;

-- "Sin categoría" en gris: ya no se confunde con "Otros" en el gráfico.
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
    coalesce(c.color, 'gris'::public.color_app),
    sum(m.monto_base)
  from public.movimientos m
  left join public.categorias c on c.id = m.categoria_id
  where m.tipo in ('GASTO', 'OCIO')
    and m.fecha between p_desde and p_hasta
  group by c.id, c.nombre, c.color
  order by 4 desc;
$$;
