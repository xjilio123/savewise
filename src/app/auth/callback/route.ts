import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Google devuelve aquí un código de un solo uso. Se canjea por la sesión y siempre
// se redirige a una ruta fija: no se acepta un parámetro "next" (evita open redirects).
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("code");

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(new URL("/login?error=1", request.url));
}
