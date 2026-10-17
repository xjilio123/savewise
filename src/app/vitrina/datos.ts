import type { MesGrafico } from "@/components/vistas/VistaDashboard";
import type { Aporte, DeudaConPagos, FilaHistorial, GastoCategoria } from "@/lib/datos/repositorio";
import type { PagoCalendario } from "@/lib/ideas";
import type { TipoMovimiento } from "@/lib/supabase/tipos";

// Datos FICTICIOS: el ejemplo de la propuesta con sueldo de S/ 1,500. Nunca se guardan en ninguna base.
export const HOY = "2026-10-17";

export const CATEGORIAS = [
  { id: "c1", nombre: "Alimentación" },
  { id: "c2", nombre: "Transporte" },
  { id: "c3", nombre: "Suscripciones" },
  { id: "c4", nombre: "Ocio" },
  { id: "c5", nombre: "Servicios" },
];

function fila(
  id: string,
  fecha: string,
  tipo: TipoMovimiento,
  concepto: string,
  monto: number,
  categoria: FilaHistorial["categoria"],
  extra: Partial<FilaHistorial> = {},
): FilaHistorial {
  return {
    id,
    user_id: "ficticio",
    fecha,
    tipo,
    concepto,
    monto,
    moneda: "PEN",
    tipo_cambio: 1,
    monto_base: monto,
    categoria_id: null,
    meta_id: null,
    deuda_id: null,
    recurrente: false,
    nota: "",
    creado: `${fecha}T12:00:00Z`,
    categoria,
    ...extra,
  };
}

export const FILAS: FilaHistorial[] = [
  fila("m1", "2026-10-17", "OCIO", "Café", 12.5, { nombre: "Ocio", color: "morado" }),
  fila("m2", "2026-10-14", "OCIO", "Libro", 59, { nombre: "Ocio", color: "morado" }),
  fila("m3", "2026-10-12", "GASTO", "Spotify", 8.22, { nombre: "Suscripciones", color: "negro" }, { recurrente: true }),
  fila("m4", "2026-10-12", "OCIO", "Cine", 32, { nombre: "Ocio", color: "morado" }),
  fila("m5", "2026-10-08", "GASTO", "Curso online", 68.68, { nombre: "Educación", color: "azul" }, { moneda: "USD", monto: 20, tipo_cambio: 3.434 }),
  fila("m6", "2026-10-03", "GASTO", "Claude", 100, { nombre: "Suscripciones", color: "negro" }, { recurrente: true }),
  fila("m7", "2026-10-02", "AHORRO", "Aporte Navidad", 200, null),
  fila("m8", "2026-10-02", "PARA_MI", "Bolsa del mes", 250, null),
  fila("m9", "2026-10-01", "INGRESO", "Bono", 120, null),
  fila("m10", "2026-10-01", "GASTO", "Mercado", 300, { nombre: "Alimentación", color: "rojo" }),
];

export const MOVIMIENTOS = [
  { tipo: "GASTO" as const, monto_base: 300 },
  { tipo: "GASTO" as const, monto_base: 150 },
  { tipo: "GASTO" as const, monto_base: 100 },
  { tipo: "GASTO" as const, monto_base: 39.9 },
  { tipo: "GASTO" as const, monto_base: 8.22 },
  { tipo: "AHORRO" as const, monto_base: 200 },
  { tipo: "AHORRO" as const, monto_base: 100 },
  { tipo: "PARA_MI" as const, monto_base: 250 },
  { tipo: "OCIO" as const, monto_base: 12.5 },
  { tipo: "OCIO" as const, monto_base: 59 },
  { tipo: "OCIO" as const, monto_base: 32 },
];

export const POR_CATEGORIA: GastoCategoria[] = [
  { id: "c1", nombre: "Alimentación", color: "rojo", total: 300, tope: 350, variacion: -12 },
  { id: "c2", nombre: "Transporte", color: "azul", total: 150, tope: 120, variacion: 25 },
  { id: "c3", nombre: "Suscripciones", color: "negro", total: 108.22 },
  { id: "c4", nombre: "Ocio", color: "morado", total: 103.5 },
  { id: "c5", nombre: "Servicios", color: "verde", total: 39.9 },
];

export const MESES: MesGrafico[] = ["nov", "dic", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct"].map(
  (etiqueta, i) => ({
    etiqueta,
    gastos: [0, 0, 0, 0, 0, 0, 0, 520, 610, 480, 655, 701.62][i]!,
    ahorros: [0, 0, 0, 0, 0, 0, 0, 200, 250, 300, 280, 300][i]!,
  }),
);

const deuda = (d: Partial<DeudaConPagos> & Pick<DeudaConPagos, "id" | "nombre" | "monto_total" | "pagado">): DeudaConPagos => ({
  user_id: "ficticio",
  tipo: "tarjeta",
  cuota_mensual: null,
  dia_pago: null,
  tea: null,
  moneda: "PEN",
  cerrada: false,
  creado: "2026-08-01T12:00:00Z",
  ...d,
});

export const DEUDAS: DeudaConPagos[] = [
  deuda({ id: "d1", nombre: "Visa", monto_total: 2500, pagado: 750, cuota_mensual: 250, dia_pago: 5, tea: 65 }),
  deuda({ id: "d2", nombre: "Préstamo celular", tipo: "prestamo", monto_total: 1200, pagado: 200, cuota_mensual: 40, tea: 60 }),
  deuda({ id: "d3", nombre: "Préstamo de mamá", tipo: "otro", monto_total: 300, pagado: 300, cerrada: true }),
];

export const APORTES: Aporte[] = [
  { id: "a1", fecha: "2026-10-15", concepto: "Ahorro quincena", monto: 200, moneda: "PEN", meta: { nombre: "Navidad" } },
  { id: "a2", fecha: "2026-10-01", concepto: "Ahorro de sueldo", monto: 100, moneda: "PEN", meta: { nombre: "Fondo de emergencia" } },
  { id: "a3", fecha: "2026-09-30", concepto: "Vuelto del mes", monto: 51.88, moneda: "PEN", meta: { nombre: "Navidad" } },
];

export const PAGOS: PagoCalendario[] = [
  { fecha: "2026-10-01", concepto: "Sueldo", monto: 1500, moneda: "PEN", origen: "recurrente", tipo: "INGRESO", pagado: true, movimientoId: "00000000-0000-0000-0000-0000000000f1" },
  { fecha: "2026-10-05", concepto: "Visa", monto: 250, moneda: "PEN", origen: "deuda", tipo: null, pagado: true, movimientoId: null },
  { fecha: "2026-10-12", concepto: "Spotify", monto: 8.22, moneda: "PEN", origen: "recurrente", tipo: "GASTO", pagado: true, movimientoId: "00000000-0000-0000-0000-0000000000f2" },
  { fecha: "2026-10-20", concepto: "Netflix", monto: 39.9, moneda: "PEN", origen: "recurrente", tipo: "GASTO", pagado: false, movimientoId: "00000000-0000-0000-0000-0000000000f3" },
  { fecha: "2026-10-28", concepto: "Préstamo celular", monto: 40, moneda: "PEN", origen: "deuda", tipo: null, pagado: false, movimientoId: null },
];
