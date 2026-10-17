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

const DIA_MS = 86_400_000;
const partes = (fecha: string) => fecha.split("-").map(Number) as [number, number, number];
const aMs = (fecha: string) => {
  const [a, m, d] = partes(fecha);
  return Date.UTC(a, m - 1, d);
};
const aTexto = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const diasEnMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

export function sumarDias(fecha: string, dias: number): string {
  return aTexto(aMs(fecha) + dias * DIA_MS);
}

/**
 * Tu mes financiero: empieza el día de pago y termina el día anterior al siguiente pago.
 * Con día de pago 1 es el mes calendario. Si el día no existe (31 en febrero), se usa el último día del mes.
 */
export function periodoFinanciero(hoy: string, diaPago: number): RangoMes {
  const [anio, mes, dia] = partes(hoy);
  const corte = (a: number, m: number) => Math.min(Math.max(1, Math.trunc(diaPago)), diasEnMes(a, m));

  let anioInicio = anio;
  let mesInicio = mes;
  if (dia < corte(anio, mes)) {
    mesInicio -= 1;
    if (mesInicio === 0) {
      mesInicio = 12;
      anioInicio -= 1;
    }
  }
  const anioSiguiente = mesInicio === 12 ? anioInicio + 1 : anioInicio;
  const mesSiguiente = mesInicio === 12 ? 1 : mesInicio + 1;

  const inicio = Date.UTC(anioInicio, mesInicio - 1, corte(anioInicio, mesInicio));
  const siguiente = Date.UTC(anioSiguiente, mesSiguiente - 1, corte(anioSiguiente, mesSiguiente));
  const total = Math.round((siguiente - inicio) / DIA_MS);
  const transcurridos = Math.round((aMs(hoy) - inicio) / DIA_MS) + 1;

  return {
    desde: aTexto(inicio),
    hasta: aTexto(siguiente - DIA_MS),
    diasDelMes: total,
    diasRestantes: total - transcurridos + 1,
    fraccionTranscurrida: transcurridos / total,
  };
}

/** Atajos de rango para los filtros: este periodo, el anterior y los últimos tres. */
export function rangosRapidos(hoy: string, diaPago: number) {
  const actual = periodoFinanciero(hoy, diaPago);
  const anterior = periodoFinanciero(sumarDias(actual.desde, -1), diaPago);
  const anteAnterior = periodoFinanciero(sumarDias(anterior.desde, -1), diaPago);
  return {
    periodo: { desde: actual.desde, hasta: actual.hasta },
    anterior: { desde: anterior.desde, hasta: anterior.hasta },
    tresPeriodos: { desde: anteAnterior.desde, hasta: actual.hasta },
  };
}

const formatoCorto = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });

/** "17 oct" */
export function fechaCorta(fecha: string): string {
  return formatoCorto.format(new Date(aMs(fecha))).replace(".", "");
}

/** "1 oct – 31 oct" */
export function etiquetaRango(desde: string, hasta: string): string {
  return `${fechaCorta(desde)} – ${fechaCorta(hasta)}`;
}

/** "sáb 17 oct" */
export function fechaDiaSemana(fecha: string): string {
  return new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(aMs(fecha)))
    .replace(/[.,]/g, "");
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
