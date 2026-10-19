// Reglas del resumen con IA tal como las ve la persona. Quien las hace cumplir es la base de datos
// (reservar_resumen_ia): aquí solo se muestran.

export const TOPE_DIARIO_IA = 10;

/** Lo que devuelve la acción del servidor; lo que falte se mantiene del estado anterior. */
export type RespuestaIA = { texto?: string; error?: string; usados?: number; espera?: number };

/** Estado del resumen en pantalla. `marca` cambia con cada respuesta para reiniciar la cuenta regresiva. */
export type EstadoIA = { texto: string | null; error?: string; usados: number; espera: number; marca: number };

/** 95 → "1:35". */
export function formatoEspera(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function restantesIA(usados: number): number {
  return Math.max(0, TOPE_DIARIO_IA - usados);
}

/** Mensaje cuando la base no deja pedir otro. Con "espera" no hace falta: el botón ya muestra cuánto falta. */
export function mensajeBloqueo(motivo: string | null): string | undefined {
  if (motivo === "tope") return `Ya usaste tus ${TOPE_DIARIO_IA} resúmenes de hoy. Mañana tienes ${TOPE_DIARIO_IA} más.`;
  if (motivo === "en_curso") return "Tu resumen ya se está generando.";
  return undefined;
}

/** Une la respuesta nueva con lo que ya se veía: un error no borra el último resumen. */
export function siguienteEstadoIA(previo: EstadoIA, r: RespuestaIA, marca: number): EstadoIA {
  return {
    texto: r.texto ?? previo.texto,
    error: r.error,
    usados: r.usados ?? previo.usados,
    espera: r.espera ?? 0,
    marca,
  };
}
