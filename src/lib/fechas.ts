const ZONA = "America/Lima";

const dos = (n: number) => String(n).padStart(2, "0");

/** Fecha de hoy en Lima, formato AAAA-MM-DD. */
export function hoyLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

export type RangoMes = {
  desde: string;
  hasta: string;
  diasDelMes: number;
  diasRestantes: number;
  fraccionTranscurrida: number;
};

/** Primer y último día del mes de `hoy`, y cuánto del mes ya pasó (hoy cuenta como día restante). */
export function rangoDelMes(hoy: string): RangoMes {
  const [anio, mes, dia] = hoy.split("-").map(Number) as [number, number, number];
  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return {
    desde: `${anio}-${dos(mes)}-01`,
    hasta: `${anio}-${dos(mes)}-${dos(diasDelMes)}`,
    diasDelMes,
    diasRestantes: diasDelMes - dia + 1,
    fraccionTranscurrida: dia / diasDelMes,
  };
}

/** Meses completos de aporte que quedan desde `hoy` hasta `fechaObjetivo` (mínimo 1). */
export function mesesHasta(hoy: string, fechaObjetivo: string): number {
  const [a1, m1] = hoy.split("-").map(Number) as [number, number];
  const [a2, m2] = fechaObjetivo.split("-").map(Number) as [number, number];
  return Math.max(1, (a2 - a1) * 12 + (m2 - m1) + 1);
}

/** "Sábado 17 de octubre" */
export function fechaLarga(hoy: string): string {
  const [anio, mes, dia] = hoy.split("-").map(Number) as [number, number, number];
  const texto = new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
  const limpio = texto.replace(",", "");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}
