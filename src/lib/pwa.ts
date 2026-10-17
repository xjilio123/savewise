import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

// ---------- Notificaciones push ----------

// Solo se aceptan endpoints de los servicios push oficiales: el servidor hará peticiones a esa URL,
// así que una URL arbitraria (interna o de un atacante) sería un SSRF.
const HOSTS_PUSH = [
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

export function endpointPermitido(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.port && HOSTS_PUSH.some((h) => h.test(url.hostname));
  } catch {
    return false;
  }
}

export const esquemaSuscripcion = z.object({
  endpoint: z
    .string()
    .max(1000)
    .refine(endpointPermitido, { error: "Servicio de notificaciones no permitido" }),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(8).max(100),
  }),
});

// ---------- Atajo de Siri ----------

/** Token de 256 bits en base64url (43 caracteres). Se muestra una sola vez; solo se guarda su huella. */
export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

export function huellaToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const FORMATO_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

/** Lee "Bearer <token>" y valida su formato antes de tocar la base de datos. */
export function tokenDeCabecera(cabecera: string | null): string | null {
  const token = cabecera?.match(/^Bearer\s+(\S+)$/)?.[1];
  return token && FORMATO_TOKEN.test(token) ? token : null;
}

// Atajos de iOS puede mandar el monto como número o como texto con coma decimal ("12,50").
const montoAtajo = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().replace(",", ".") : v),
  z.coerce
    .number({ error: "Monto inválido" })
    .positive({ error: "El monto debe ser mayor a 0" })
    .max(999_999_999, { error: "Monto demasiado grande" })
    .multipleOf(0.01, { error: "Usa máximo 2 decimales" }),
);

export const esquemaAtajo = z.object({
  monto: montoAtajo,
  concepto: z.string().trim().min(1, { error: "Falta el concepto" }).max(80, { error: "Concepto muy largo" }),
  categoria: z.string().trim().max(40).optional(),
  tipo: z.enum(["GASTO", "OCIO", "INGRESO"]).default("GASTO"),
});
