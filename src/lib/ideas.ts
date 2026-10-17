// Mejoras pequeñas de uso diario: frecuentes, calendario de pagos, comparación por categoría
// y reto de 52 semanas. Todo son funciones puras: se prueban sin base de datos.

import { sumarDias } from "@/lib/fechas";
import type { TipoMovimiento } from "@/lib/supabase/tipos";

// ---------- Frecuentes ----------

export type MovimientoParaFrecuentes = {
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  moneda: string;
  categoria_id: string | null;
  fecha: string;
};

export type Frecuente = { tipo: "GASTO" | "OCIO"; concepto: string; monto: number; moneda: string; categoria_id: string | null; veces: number };

/** Gastos que repites igual (mismo concepto y monto) al menos 2 veces; los más usados primero. */
export function gastosFrecuentes(movimientos: MovimientoParaFrecuentes[], limite = 4): Frecuente[] {
  const grupos = new Map<string, Frecuente & { ultima: string }>();
  for (const m of movimientos) {
    if (m.tipo !== "GASTO" && m.tipo !== "OCIO") continue;
    const clave = `${m.tipo}|${m.concepto.trim().toLowerCase()}|${m.monto.toFixed(2)}|${m.moneda}`;
    const g = grupos.get(clave);
    if (g) {
      g.veces += 1;
      if (m.fecha > g.ultima) g.ultima = m.fecha;
    } else {
      grupos.set(clave, {
        tipo: m.tipo,
        concepto: m.concepto.trim(),
        monto: m.monto,
        moneda: m.moneda,
        categoria_id: m.categoria_id,
        veces: 1,
        ultima: m.fecha,
      });
    }
  }
  return [...grupos.values()]
    .filter((g) => g.veces >= 2)
    .sort((a, b) => b.veces - a.veces || b.ultima.localeCompare(a.ultima))
    .slice(0, limite)
    .map((g) => ({ tipo: g.tipo, concepto: g.concepto, monto: g.monto, moneda: g.moneda, categoria_id: g.categoria_id, veces: g.veces }));
}

// ---------- Calendario de pagos ----------

export type PagoCalendario = {
  fecha: string;
  concepto: string;
  monto: number | null;
  moneda: string;
  /** "recurrente": un movimiento que se repite cada mes (de cualquier tipo); "deuda": una cuota. */
  origen: "recurrente" | "deuda";
  /** Tipo del movimiento que se repite (null en cuotas de deudas). */
  tipo: TipoMovimiento | null;
  pagado: boolean;
  /** Último movimiento de la serie: sirve para dejar de repetirla o borrar el registro del periodo. */
  movimientoId: string | null;
};

type MovimientoReciente = {
  id: string;
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  moneda: string;
  fecha: string;
  recurrente: boolean;
  deuda_id: string | null;
};
type DeudaCalendario = { id: string; nombre: string; cuota_mensual: number | null; dia_pago: number | null; moneda: string; cerrada: boolean };

const diasEnMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

/** Misma fecha un mes después; si el día no existe (31 de abril), el último día del mes. */
export function unMesDespues(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number) as [number, number, number];
  const anio = m === 12 ? a + 1 : a;
  const mes = m === 12 ? 1 : m + 1;
  const dia = Math.min(d, diasEnMes(anio, mes));
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Fechas de un día de pago (1..31) que caen dentro del rango. */
function fechasDeDiaDePago(dia: number, desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  let [a, m] = desde.split("-").map(Number) as [number, number];
  for (let i = 0; i < 3; i++) {
    const f = `${a}-${String(m).padStart(2, "0")}-${String(Math.min(dia, diasEnMes(a, m))).padStart(2, "0")}`;
    if (f >= desde && f <= hasta) fechas.push(f);
    m += 1;
    if (m === 13) {
      m = 1;
      a += 1;
    }
  }
  return fechas;
}

/**
 * Calendario del periodo: lo que se repite cada mes (el último movimiento de cada concepto)
 * y cuotas de deudas abiertas con día de pago. Marca como pagado lo que ya se registró.
 */
export function calendarioDePagos(datos: {
  movimientos: MovimientoReciente[];
  deudas: DeudaCalendario[];
  desde: string;
  hasta: string;
}): PagoCalendario[] {
  const { desde, hasta } = datos;
  const pagos: PagoCalendario[] = [];

  // Último movimiento por concepto (como el cron de recurrentes).
  const ultimos = new Map<string, MovimientoReciente>();
  for (const m of [...datos.movimientos].sort((x, y) => x.fecha.localeCompare(y.fecha))) {
    ultimos.set(m.concepto.trim().toLowerCase(), m);
  }
  for (const m of ultimos.values()) {
    if (!m.recurrente || m.deuda_id) continue; // los pagos de deudas salen como deuda
    const base = { concepto: m.concepto, monto: m.monto, moneda: m.moneda, origen: "recurrente" as const, tipo: m.tipo, movimientoId: m.id };
    if (m.fecha >= desde && m.fecha <= hasta) pagos.push({ ...base, fecha: m.fecha, pagado: true });
    const siguiente = unMesDespues(m.fecha);
    if (siguiente >= desde && siguiente <= hasta) pagos.push({ ...base, fecha: siguiente, pagado: false });
  }

  const deudasPagadas = new Set(
    datos.movimientos.filter((m) => m.deuda_id && m.fecha >= desde && m.fecha <= hasta).map((m) => m.deuda_id),
  );
  for (const d of datos.deudas) {
    if (d.cerrada || !d.dia_pago) continue;
    for (const fecha of fechasDeDiaDePago(d.dia_pago, desde, hasta)) {
      pagos.push({
        fecha,
        concepto: d.nombre,
        monto: d.cuota_mensual,
        moneda: d.moneda,
        origen: "deuda",
        tipo: null,
        pagado: deudasPagadas.has(d.id),
        movimientoId: null,
      });
    }
  }

  return pagos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.concepto.localeCompare(b.concepto));
}

// ---------- Comparación por categoría ----------

/** Variación porcentual frente al periodo anterior. null si antes no hubo gasto (no hay con qué comparar). */
export function variacion(actual: number, anterior: number | undefined): number | null {
  if (!anterior || anterior <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

// ---------- Reto de 52 semanas ----------

export const SEMANAS_RETO = 52;
/** 1 + 2 + … + 52 = 1378 veces el monto base. */
export const objetivoReto = (base: number) => Math.round(base * ((SEMANAS_RETO * (SEMANAS_RETO + 1)) / 2) * 100) / 100;

/** Semana actual del reto (1..52) y lo que toca aportar: semana × monto base. */
export function semanaDelReto(base: number, inicio: string, hoy: string): { semana: number; monto: number; terminado: boolean } {
  const dias = Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000);
  const semana = Math.floor(Math.max(0, dias) / 7) + 1;
  if (semana > SEMANAS_RETO) return { semana: SEMANAS_RETO, monto: 0, terminado: true };
  return { semana, monto: Math.round(semana * base * 100) / 100, terminado: false };
}

/** Fecha en que termina el reto: 52 semanas después de empezar. */
export const finDelReto = (inicio: string) => sumarDias(inicio, SEMANAS_RETO * 7 - 1);
