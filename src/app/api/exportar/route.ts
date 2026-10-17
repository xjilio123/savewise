import { aCsv } from "@/lib/csv";
import { NOMBRE_TIPO } from "@/lib/colores";
import { hoyLima } from "@/lib/fechas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { TipoMovimiento } from "@/lib/supabase/tipos";

// Descarga de todos tus movimientos en CSV. Exportar todo es sensible: se verifica la sesión
// con getUser (detecta sesiones revocadas) y RLS garantiza que solo salgan tus filas.

const LOTE = 1000;

export async function GET() {
  const supabase = await crearClienteServidor();
  const { data: sesion, error: errorSesion } = await supabase.auth.getUser();
  if (errorSesion || !sesion.user) return new Response("No autorizado", { status: 401 });

  const filas: (string | number | boolean | null)[][] = [];
  for (let desde = 0; ; desde += LOTE) {
    const { data, error } = await supabase
      .from("movimientos")
      .select("fecha, tipo, concepto, nota, monto, moneda, tipo_cambio, monto_base, recurrente, categoria:categorias(nombre), meta:metas(nombre)")
      .order("fecha", { ascending: true })
      .order("creado", { ascending: true })
      .range(desde, desde + LOTE - 1);
    if (error) return new Response("No se pudo exportar", { status: 500 });

    for (const m of data ?? []) {
      filas.push([
        m.fecha,
        NOMBRE_TIPO[m.tipo as TipoMovimiento],
        m.concepto,
        m.nota,
        m.categoria?.nombre ?? "",
        m.meta?.nombre ?? "",
        Number(m.monto),
        m.moneda,
        Number(m.tipo_cambio),
        Number(m.monto_base),
        m.recurrente,
      ]);
    }
    if (!data || data.length < LOTE) break;
  }

  const csv = aCsv(
    ["fecha", "tipo", "concepto", "nota", "categoria", "meta", "monto", "moneda", "tipo_cambio", "monto_base", "se_repite"],
    filas,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="savewise-${hoyLima()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
