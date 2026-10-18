-- Más colores para que ninguna categoría repita color (9 categorías > 5 colores).
-- Van en su propia migración: un valor nuevo de un enum no se puede usar en la misma transacción.
alter type public.color_app add value if not exists 'naranja';
alter type public.color_app add value if not exists 'rosa';
alter type public.color_app add value if not exists 'turquesa';
alter type public.color_app add value if not exists 'indigo';
alter type public.color_app add value if not exists 'gris';
