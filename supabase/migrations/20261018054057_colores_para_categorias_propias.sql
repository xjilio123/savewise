-- Tres colores más para crear categorías propias sin repetir (hasta 12 por persona).
-- En su propia migración: un valor nuevo de un enum no se usa en la misma transacción.
alter type public.color_app add value if not exists 'amarillo';
alter type public.color_app add value if not exists 'menta';
alter type public.color_app add value if not exists 'marron';
