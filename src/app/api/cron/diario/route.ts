import { timingSafeEqual } from "node:crypto";
import { enviarAviso } from "@/lib/notificaciones";
import { crearClienteAnonimo } from "@/lib/supabase/anonimo";
import { obtenerTipoCambio } from "@/lib/tipoCambio";

// Lo llama Vercel Cron una vez al día (9:00 de Lima) con "Authorization: Bearer $CRON_SECRET".
// 1) Mantiene activo el proyecto de Supabase (el plan gratis se pausa tras 7 días sin uso).
// 2) Registra los movimientos marcados "se repite cada mes" que vencen hoy.
// 3) Envía los avisos del día: renovaciones en 3 días y "hoy cobras".
// 4) Precalienta la caché del tipo de cambio.

function secretoValido(cabecera: string | null): string | null {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || !cabecera) return null;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(cabecera);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido) ? secreto : null;
}

export async function GET(request: Request) {
  const secreto = secretoValido(request.headers.get("authorization"));
  if (!secreto) return new Response("No autorizado", { status: 401 });

  const supabase = crearClienteAnonimo();
  const ping = await supabase.rpc("ping");

  // Primero registra los gastos recurrentes del día; luego avisa de las próximas renovaciones.
  const recurrentes = await supabase.rpc("generar_recurrentes", { p_token: secreto });

  // La base solo devuelve los avisos si el secreto coincide con su huella guardada.
  const { data: avisos, error } = await supabase.rpc("recordatorios_del_dia", { p_token: secreto });
  let enviados = 0;
  let vencidas = 0;
  for (const a of avisos ?? []) {
    const resultado = await enviarAviso(
      { endpoint: a.r_endpoint, p256dh: a.r_p256dh, auth: a.r_auth },
      { titulo: a.r_titulo, cuerpo: a.r_cuerpo, url: a.r_url },
    );
    if (resultado === "ok") enviados++;
    if (resultado === "vencida") {
      vencidas++;
      await supabase.rpc("eliminar_suscripcion_vencida", { p_token: secreto, p_endpoint: a.r_endpoint });
    }
  }

  const tipoCambio = await obtenerTipoCambio("USD", "PEN").then(
    () => true,
    () => false,
  );

  return Response.json(
    {
      supabase: !ping.error,
      recurrentes: recurrentes.error ? "error" : recurrentes.data,
      avisos: error ? "error" : { enviados, vencidas },
      tipoCambio,
    },
    { status: ping.error ? 502 : 200 },
  );
}
