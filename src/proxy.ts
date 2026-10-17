import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { construirCsp, generarNonce } from "@/lib/seguridad/csp";

// /api/cron se protege con su propio secreto. /vitrina (datos ficticios) solo existe en desarrollo.
const RUTAS_PUBLICAS = [
  "/login",
  "/auth/callback",
  "/api/cron",
  "/api/atajo",
  "/offline",
  ...(process.env.NODE_ENV === "development" ? ["/vitrina"] : []),
];

const esPublica = (ruta: string) => RUTAS_PUBLICAS.some((r) => ruta === r || ruta.startsWith(`${r}/`));

export async function proxy(request: NextRequest) {
  const nonce = generarNonce();
  const csp = construirCsp({
    nonce,
    desarrollo: process.env.NODE_ENV === "development",
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  });

  const cabecerasRequest = new Headers(request.headers);
  cabecerasRequest.set("x-nonce", nonce);
  cabecerasRequest.set("Content-Security-Policy", csp);

  let respuesta = NextResponse.next({ request: { headers: cabecerasRequest } });

  // Refresca la sesión de Supabase en cada navegación y reescribe sus cookies.
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGuardar, cabeceras) {
        for (const { name, value } of cookiesParaGuardar) request.cookies.set(name, value);
        cabecerasRequest.set("cookie", request.headers.get("cookie") ?? "");
        respuesta = NextResponse.next({ request: { headers: cabecerasRequest } });
        for (const { name, value, options } of cookiesParaGuardar) respuesta.cookies.set(name, value, options);
        for (const [clave, valor] of Object.entries(cabeceras ?? {})) respuesta.headers.set(clave, valor);
      },
    },
  });

  let conSesion = false;
  try {
    const { data } = await supabase.auth.getClaims();
    conSesion = Boolean(data?.claims);
  } catch {
    conSesion = false;
  }

  const ruta = request.nextUrl.pathname;
  const destino = !conSesion && !esPublica(ruta) ? "/login" : conSesion && ruta === "/login" ? "/" : null;

  if (destino) {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    const redireccion = NextResponse.redirect(url);
    for (const cookie of respuesta.cookies.getAll()) redireccion.cookies.set(cookie);
    redireccion.headers.set("Content-Security-Policy", csp);
    return redireccion;
  }

  respuesta.headers.set("Content-Security-Policy", csp);
  return respuesta;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|icon.png|apple-icon.png|manifest.webmanifest|sw.js|iconos/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
