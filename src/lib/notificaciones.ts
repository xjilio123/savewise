import "server-only";
import webpush from "web-push";
import { endpointPermitido } from "@/lib/pwa";

export type Aviso = { titulo: string; cuerpo: string; url: string };
type Destino = { endpoint: string; p256dh: string; auth: string };

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  webpush.setVapidDetails("https://savewise-inky.vercel.app", publica, privada);
  configurado = true;
  return true;
}

/** Envía un aviso. "vencida" = el servicio push dice que esa suscripción ya no existe (404/410). */
export async function enviarAviso(destino: Destino, aviso: Aviso): Promise<"ok" | "vencida" | "error"> {
  if (!configurar() || !endpointPermitido(destino.endpoint)) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: destino.endpoint, keys: { p256dh: destino.p256dh, auth: destino.auth } },
      JSON.stringify(aviso),
      { TTL: 12 * 60 * 60, urgency: "normal" },
    );
    return "ok";
  } catch (error) {
    const estado = (error as { statusCode?: number }).statusCode;
    return estado === 404 || estado === 410 ? "vencida" : "error";
  }
}
