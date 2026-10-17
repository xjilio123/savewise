import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { obtenerTipoCambio } from "@/lib/tipoCambio";

// Lo llama Vercel Cron una vez al día con "Authorization: Bearer $CRON_SECRET".
// 1) Mantiene activo el proyecto de Supabase (el plan gratis se pausa tras 7 días sin uso).
// 2) Precalienta la caché del tipo de cambio para que guardar en otra moneda sea rápido.

function autorizado(cabecera: string | null): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || !cabecera) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(cabecera);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

export async function GET(request: Request) {
  if (!autorizado(request.headers.get("authorization"))) {
    return new Response("No autorizado", { status: 401 });
  }

  const ping = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/ping`, {
    method: "POST",
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });

  const tipoCambio = await obtenerTipoCambio("USD", "PEN").then(
    () => true,
    () => false,
  );

  return Response.json({ supabase: ping.ok, tipoCambio }, { status: ping.ok ? 200 : 502 });
}
