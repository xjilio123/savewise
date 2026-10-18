-- El gris queda reservado para "Sin categoría" en los gráficos: ninguna categoría puede usarlo.
alter table public.categorias
  add constraint categorias_color_no_gris check (color <> 'gris');
