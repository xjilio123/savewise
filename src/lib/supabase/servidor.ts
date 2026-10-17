import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
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
 * Para PÁGINAS (solo lectura). getClaims verifica la firma ES256 del token con las claves públicas
 * de Supabase (en caché), sin una llamada de red por visita. Aunque alguien falsificara una cookie,
 * cada consulta vuelve a validar el token en la base de datos y RLS filtra las filas.
 */
export const requerirSesion = cache(async () => {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/login");
  return { supabase, usuario: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" } };
});

/**
 * Para SERVER ACTIONS (escrituras). getUser consulta al servidor de Supabase: además de la firma,
 * comprueba que la sesión no haya sido revocada. Nunca se confía en lo que diga el navegador.
 */
export async function requerirUsuario() {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, usuario: data.user };
}
