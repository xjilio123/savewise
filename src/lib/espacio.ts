/**
 * Tus datos: cuánto espacio usa cada persona y cuándo fue su último respaldo.
 * El cupo es orientativo (no bloquea nada): 500 MB del plan gratis de Supabase entre ~30 personas, con margen.
 * Los mismos límites están en la base (private.cupo_espacio y private.limite_base).
 */

const MB = 1024 * 1024;
export const CUPO_PERSONA = 15 * MB;
export const LIMITE_BASE = 500 * MB;
export const DIAS_RESPALDO = 30;

export type NivelEspacio = "bien" | "pronto" | "lleno";

/** Color de la barra y del estado: verde, naranja (como los demás avisos de la app) o rojo. */
export const COLOR_NIVEL: Record<NivelEspacio, string> = { bien: "text-verde", pronto: "text-naranja", lleno: "text-rojo" };

/** Lo que devuelve la base para Ajustes › Tus datos. */
export type DatosEspacio = { bytes: number; movimientos: number; metas: number; deudas: number; ultimoRespaldo: string | null };

export type EstadoEspacio = {
  fraccion: number;
  nivel: NivelEspacio;
  /** "0.6 MB" */
  usado: string;
  /** "15 MB" */
  total: string;
  /** "4% usado" */
  porcentaje: string;
  /** "4% usado · Todo bien" */
  resumen: string;
};

/** "0.6 MB", "12 MB"; por debajo de 0.1 MB, "menos de 0.1 MB". */
export function formatoMB(bytes: number): string {
  const mb = bytes / MB;
  if (mb < 0.1) return "menos de 0.1 MB";
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

/** Bien por debajo del 70%, pronto del 70% al 89% y lleno desde el 90%. */
export function estadoEspacio(bytes: number, limite: number, umbralAviso = 0.9): EstadoEspacio {
  const fraccion = limite > 0 ? Math.max(0, bytes / limite) : 0;
  const nivel: NivelEspacio = fraccion >= umbralAviso ? "lleno" : fraccion >= 0.7 ? "pronto" : "bien";
  const pct = Math.floor(fraccion * 100);
  const porcentaje = bytes > 0 && pct === 0 ? "Menos de 1% usado" : `${pct}% usado`;
  const etiqueta = { bien: "Todo bien", pronto: "Se está llenando", lleno: "Casi lleno" }[nivel];
  return { fraccion, nivel, usado: formatoMB(bytes), total: formatoMB(limite), porcentaje, resumen: `${porcentaje} · ${etiqueta}` };
}

/** Días completos desde el último respaldo (null si nunca se descargó). */
export function diasDesdeRespaldo(ultimo: string | null, ahora: Date = new Date()): number | null {
  if (!ultimo) return null;
  return Math.max(0, Math.floor((ahora.getTime() - new Date(ultimo).getTime()) / 86_400_000));
}

/** "Último respaldo: hoy", "…: ayer", "…: hace 12 días". */
export function textoUltimoRespaldo(dias: number | null): string {
  if (dias === null) return "Aún no descargas un respaldo";
  if (dias === 0) return "Último respaldo: hoy";
  if (dias === 1) return "Último respaldo: ayer";
  return `Último respaldo: hace ${dias} días`;
}

/** El aviso de la tarjeta cuando el respaldo está viejo (30 días o más) o nunca se descargó. */
export function avisoRespaldo(dias: number | null): string | null {
  if (dias === null) return "Aún no descargas un respaldo: guárdalo en iCloud Drive o Google Drive.";
  return dias >= DIAS_RESPALDO ? `Hace ${dias} días que no descargas un respaldo.` : null;
}

/** "1,240 movimientos · 5 metas · 2 deudas" (en singular cuando toca; sin deudas, no se nombran). */
export function textoConteos(c: { movimientos: number; metas: number; deudas: number }): string {
  const n = (x: number, uno: string, varios: string) => `${x.toLocaleString("en-US")} ${x === 1 ? uno : varios}`;
  return [
    n(c.movimientos, "movimiento", "movimientos"),
    n(c.metas, "meta", "metas"),
    ...(c.deudas > 0 ? [n(c.deudas, "deuda", "deudas")] : []),
  ].join(" · ");
}
