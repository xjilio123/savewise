-- SaveWise · Fase 3 (parte 1): extensión pgcrypto y configuración privada del cron.
-- La huella SHA-256 del secreto del cron se carga aparte (no se versiona):
--   insert into private.config (clave, valor) values ('hash_cron', '<sha256 del secreto>');
create extension if not exists pgcrypto with schema extensions;

create table if not exists private.config (
  clave text primary key,
  valor text not null
);
