-- SaveWise · Color de tu perfil: cada persona elige el color del círculo con su inicial (Ajustes).
-- Vacío = "Original", el degradado de la app. El gris queda para "Sin categoría".
-- Cada persona solo cambia el suyo: lo cubre la política perfiles_update_propio que ya existe.

alter table public.perfiles
  add column color_perfil public.color_app
  constraint perfiles_color_perfil_sin_gris check (color_perfil <> 'gris');
