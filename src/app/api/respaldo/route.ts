import { hoyLima } from "@/lib/fechas";
import { armarRespaldo } from "@/lib/respaldo";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Respaldo completo en JSON. Igual que la exportación CSV: sesión verificada con getUser
// (detecta sesiones revocadas) y RLS garantiza que solo salgan tus filas.

const LOTE = 1000;

export async function GET() {
  const supabase = await crearClienteServidor();
  const { data: sesion, error: errorSesion } = await supabase.auth.getUser();
  if (errorSesion || !sesion.user) return new Response("No autorizado", { status: 401 });

  const [perfil, categorias, metas, deudas, prestamos] = await Promise.all([
    supabase.from("perfiles").select("sueldo_mensual, moneda_base, moneda_sueldo, dia_pago").single(),
    supabase.from("categorias").select("*").order("nombre"),
    supabase.from("metas").select("*").order("creado"),
    supabase.from("deudas").select("*").order("creado"),
    supabase.from("prestamos").select("*").order("fecha"),
  ]);
  if (perfil.error || categorias.error || metas.error || deudas.error || prestamos.error) {
    return new Response("No se pudo generar el respaldo", { status: 500 });
  }

  const movimientos: Record<string, unknown>[] = [];
  for (let desde = 0; ; desde += LOTE) {
    const { data, error } = await supabase
      .from("movimientos")
      .select("*")
      .order("fecha", { ascending: true })
      .order("creado", { ascending: true })
      .range(desde, desde + LOTE - 1);
    if (error) return new Response("No se pudo generar el respaldo", { status: 500 });
    movimientos.push(...(data ?? []));
    if (!data || data.length < LOTE) break;
  }

  const hoy = hoyLima();
  const respaldo = armarRespaldo({
    hoy,
    perfil: perfil.data,
    categorias: categorias.data,
    metas: metas.data,
    deudas: deudas.data,
    movimientos,
    prestamos: prestamos.data,
  });

  return new Response(JSON.stringify(respaldo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="savewise-respaldo-${hoy}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
