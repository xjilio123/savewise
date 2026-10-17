import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/tipos";

export async function crearClienteServidor() {
  const almacen = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(cookiesParaGuardar) {
        try {
          for (const { name, value, options } of cookiesParaGuardar) almacen.set(name, value, options);
        } catch {
          // En un Server Component no se pueden escribir cookies; proxy.ts ya refresca la sesión.
        }
      },
    },
  });
}

/**
 * Verifica al usuario contra el servidor de Supabase (getUser valida el token, no solo lo lee).
 * Se llama en cada página y en cada Server Action: nunca se confía en lo que diga el navegador.
 */
export async function requerirUsuario() {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, usuario: data.user };
}
