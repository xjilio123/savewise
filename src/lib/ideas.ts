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

// ---------- Gastos hormiga ----------

export type GastoHormiga = { concepto: string; veces: number; total: number };

/**
 * Gastos chicos que se repiten: cada uno hasta el 2 % del sueldo (mínimo 10) y al menos 3 veces
 * en el periodo. Devuelve los 3 que más suman y el total de todos.
 */
export function gastosHormiga(
  movimientos: { tipo: TipoMovimiento; concepto: string; monto_base: number | null }[],
  sueldo: number,
): { umbral: number; total: number; grupos: GastoHormiga[] } {
  const umbral = Math.max(10, Math.round(sueldo * 0.02));
  const grupos = new Map<string, GastoHormiga>();
  for (const m of movimientos) {
    const monto = m.monto_base ?? 0;
    if ((m.tipo !== "GASTO" && m.tipo !== "OCIO") || monto <= 0 || monto > umbral) continue;
    const clave = m.concepto.trim().toLowerCase();
    const g = grupos.get(clave) ?? { concepto: m.concepto.trim(), veces: 0, total: 0 };
    g.veces += 1;
    g.total = Math.round((g.total + monto) * 100) / 100;
    grupos.set(clave, g);
  }
  const repetidos = [...grupos.values()].filter((g) => g.veces >= 3).sort((a, b) => b.total - a.total);
  const total = Math.round(repetidos.reduce((s, g) => s + g.total, 0) * 100) / 100;
  return { umbral, total, grupos: repetidos.slice(0, 3) };
}

// ---------- Patrimonio neto ----------

export type PuntoPatrimonio = { mes: string; ahorros: number; teDeben: number; deudas: number; neto: number };

const finDeMes = (inicio: string) => {
  const [a, m] = inicio.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

/**
 * Patrimonio al cierre de cada mes: lo ahorrado en metas activas + lo que te deben − lo que debes.
 * El saldo de cada deuda abierta es lo prestado menos los pagos hechos hasta esa fecha.
 */
export function patrimonioPorMes(
  meses: string[],
  hoy: string,
  datos: {
    aportes: { fecha: string; monto_base: number | null }[];
    deudas: { id: string; monto_total: number; creado: string; cerrada: boolean }[];
    pagos: { deuda_id: string | null; fecha: string; monto_base: number | null }[];
    prestamos: { fecha: string; monto: number; cobrado: boolean; cobrado_en: string | null }[];
  },
): PuntoPatrimonio[] {
  const c = (n: number) => Math.round(n * 100);
  return meses.map((inicio) => {
    const fin = finDeMes(inicio) < hoy ? finDeMes(inicio) : hoy;
    const ahorros = datos.aportes.filter((a) => a.fecha <= fin).reduce((s, a) => s + c(a.monto_base ?? 0), 0);
    const teDeben = datos.prestamos
      .filter((p) => p.fecha <= fin && (!p.cobrado || (p.cobrado_en !== null && p.cobrado_en > fin)))
      .reduce((s, p) => s + c(p.monto), 0);
    const deudas = datos.deudas
      .filter((d) => !d.cerrada && d.creado.slice(0, 10) <= fin)
      .reduce((s, d) => {
        const pagado = datos.pagos.filter((p) => p.deuda_id === d.id && p.fecha <= fin).reduce((t, p) => t + c(p.monto_base ?? 0), 0);
        return s + Math.max(0, c(d.monto_total) - pagado);
      }, 0);
    return { mes: inicio, ahorros: ahorros / 100, teDeben: teDeben / 100, deudas: deudas / 100, neto: (ahorros + teDeben - deudas) / 100 };
  });
}
