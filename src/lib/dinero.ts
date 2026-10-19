import { mesesHasta, type RangoMes } from "@/lib/fechas";
import type { TipoMovimiento } from "@/lib/supabase/tipos";

export type Resumen = {
  ingresos: number;
  gastos: number;
  ahorros: number;
  paraMi: number;
  ocio: number;
  sinAsignar: number;
  paraMiRestante: number;
};

type MovimientoMinimo = { tipo: TipoMovimiento; monto_base: number | null };

// Se trabaja en céntimos para evitar errores de coma flotante (0.1 + 0.2).
const aCentimos = (n: number) => Math.round(n * 100);

export function calcularResumen(sueldo: number, movimientos: MovimientoMinimo[]): Resumen {
  const totales: Record<TipoMovimiento, number> = { INGRESO: 0, GASTO: 0, AHORRO: 0, PARA_MI: 0, OCIO: 0 };
  for (const m of movimientos) totales[m.tipo] += aCentimos(m.monto_base ?? 0);

  const ingresos = aCentimos(sueldo) + totales.INGRESO;
  const sinAsignar = ingresos - totales.GASTO - totales.AHORRO - totales.PARA_MI;

  return {
    ingresos: ingresos / 100,
    gastos: totales.GASTO / 100,
    ahorros: totales.AHORRO / 100,
    paraMi: totales.PARA_MI / 100,
    ocio: totales.OCIO / 100,
    sinAsignar: sinAsignar / 100,
    paraMiRestante: (totales.PARA_MI - totales.OCIO) / 100,
  };
}

export const SIN_DINERO_PARA_BOLSA =
  "No tienes dinero sin asignar, así que no puedes sumar a Para mí. Registra un ingreso o libera dinero de tus gastos o ahorros.";

/**
 * La bolsa Para mí sale de lo que queda sin asignar: no se puede sumar más de lo que hay.
 * Devuelve el mensaje para la persona, o null si alcanza.
 */
export function validarBolsa(monto: number, sinAsignar: number, moneda = "PEN"): string | null {
  if (aCentimos(sinAsignar) <= 0) return SIN_DINERO_PARA_BOLSA;
  if (aCentimos(monto) > aCentimos(sinAsignar)) {
    return `Solo tienes ${formatearDinero(sinAsignar, moneda)} sin asignar. No puedes sumar más que eso a Para mí.`;
  }
  return null;
}

/** Parte (0 a 1) que representa `parte` sobre `total`. */
export function fraccion(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, parte / total));
}

/** Cuánto aportar al mes para llegar a la meta a tiempo. Sin fecha: null. */
export function cuotaMensual(falta: number, hoy: string, fechaObjetivo: string | null): number | null {
  if (!fechaObjetivo || falta <= 0) return null;
  return Math.ceil(aCentimos(falta) / mesesHasta(hoy, fechaObjetivo)) / 100;
}

/** Cuánto puedes gastar por día de Para mí en lo que queda del mes. */
export function paraMiPorDia(restante: number, mes: RangoMes): number {
  if (restante <= 0) return 0;
  return Math.floor(aCentimos(restante) / mes.diasRestantes) / 100;
}

export function formatearDinero(monto: number, moneda = "PEN"): string {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda }).format(monto);
}
