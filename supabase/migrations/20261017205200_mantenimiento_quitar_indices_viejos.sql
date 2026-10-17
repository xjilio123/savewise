-- Quita los índices de una sola columna: los reemplazan los compuestos (x_id, user_id).
-- Se aplica aparte desde el editor SQL de Supabase (el conector MCP rechaza sentencias DROP).
drop index if exists public.movimientos_categoria_idx;
drop index if exists public.movimientos_meta_idx;
drop index if exists public.movimientos_deuda_idx;
