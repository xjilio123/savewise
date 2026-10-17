import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Cliente sin sesión (rol anon, clave pública) para el cron y el Atajo.
 * Solo puede ejecutar funciones que exigen su propio secreto; RLS bloquea todo lo demás.
 */
export function crearClienteAnonimo() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
