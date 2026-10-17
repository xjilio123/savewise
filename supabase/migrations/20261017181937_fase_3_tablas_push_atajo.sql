-- SaveWise · Fase 3 (parte 2): tablas de suscripciones push y token del Atajo, con RLS.

create table public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  creado timestamptz not null default now()
);
alter table public.push_suscripciones enable row level security;
create policy "push_select_propias" on public.push_suscripciones
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "push_insert_propias" on public.push_suscripciones
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "push_delete_propias" on public.push_suscripciones
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Solo se guarda la huella SHA-256 del token, nunca el token.
create table public.tokens_atajo (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  hash_token text not null unique check (hash_token ~ '^[0-9a-f]{64}$'),
  creado timestamptz not null default now(),
  ultimo_uso timestamptz,
  ventana_inicio timestamptz,
  usos_ventana integer not null default 0
);
alter table public.tokens_atajo enable row level security;
create policy "atajo_select_propio" on public.tokens_atajo
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "atajo_insert_propio" on public.tokens_atajo
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "atajo_delete_propio" on public.tokens_atajo
  for delete to authenticated using ((select auth.uid()) = user_id);
