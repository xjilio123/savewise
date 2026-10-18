import { describe, expect, it } from "vitest";
import {
  calendarioDePagos,
  finDelReto,
  gastosFrecuentes,
  gastosHormiga,
  objetivoReto,
  patrimonioPorMes,
  semanaDelReto,
  unMesDespues,
  variacion,
} from "./ideas";

const mov = (concepto: string, monto: number, fecha: string, tipo: "GASTO" | "OCIO" | "AHORRO" = "GASTO") => ({
  tipo,
  concepto,
  monto,
  moneda: "PEN",
  categoria_id: "c1",
  fecha,
});

describe("gastosFrecuentes", () => {
  it("agrupa por concepto y monto, ignorando mayúsculas y espacios", () => {
    const f = gastosFrecuentes([
      mov("Pasaje", 3.5, "2026-10-01"),
      mov("pasaje ", 3.5, "2026-10-02"),
      mov("Pasaje", 3.5, "2026-10-03"),
      mov("Almuerzo", 12, "2026-10-02"),
      mov("Almuerzo", 12, "2026-10-04"),
      mov("Cine", 20, "2026-10-05"),
    ]);
    expect(f.map((x) => [x.concepto, x.veces])).toEqual([
      ["Pasaje", 3],
      ["Almuerzo", 2],
    ]);
  });

  it("no cuenta ahorros ni montos distintos", () => {
    const f = gastosFrecuentes([mov("Meta", 100, "2026-10-01", "AHORRO"), mov("Meta", 100, "2026-10-02", "AHORRO"), mov("Taxi", 10, "2026-10-01"), mov("Taxi", 12, "2026-10-02")]);
    expect(f).toEqual([]);
  });

  it("respeta el límite", () => {
    const muchos = ["a", "b", "c", "d", "e"].flatMap((c) => [mov(c, 1, "2026-10-01"), mov(c, 1, "2026-10-02")]);
    expect(gastosFrecuentes(muchos, 4)).toHaveLength(4);
  });
});

describe("unMesDespues", () => {
  it("suma un mes y ajusta fin de mes", () => {
    expect(unMesDespues("2026-10-15")).toBe("2026-11-15");
    expect(unMesDespues("2026-01-31")).toBe("2026-02-28");
    expect(unMesDespues("2026-12-05")).toBe("2027-01-05");
  });
});

describe("calendarioDePagos", () => {
  const base = { desde: "2026-10-01", hasta: "2026-10-31" };
  const m = (concepto: string, fecha: string, recurrente: boolean, deuda_id: string | null = null) => ({
    id: `id-${concepto}-${fecha}`,
    tipo: "GASTO" as const,
    concepto,
    monto: 30,
    moneda: "PEN",
    fecha,
    recurrente,
    deuda_id,
  });

  it("suscripción pagada este mes y otra que vence más adelante", () => {
    const pagos = calendarioDePagos({
      ...base,
      movimientos: [m("Netflix", "2026-10-05", true), m("Spotify", "2026-09-20", true)],
      deudas: [],
    });
    expect(pagos.map((p) => [p.fecha, p.concepto, p.pagado])).toEqual([
      ["2026-10-05", "Netflix", true],
      ["2026-10-20", "Spotify", false],
    ]);
  });

  it("cada fila lleva el último movimiento de la serie y su tipo (para dejar de repetirla)", () => {
    const ingreso = { ...m("Sueldo", "2026-09-30", true), tipo: "INGRESO" as const };
    const pagos = calendarioDePagos({ ...base, movimientos: [ingreso], deudas: [] });
    expect(pagos).toEqual([
      expect.objectContaining({ fecha: "2026-10-30", tipo: "INGRESO", origen: "recurrente", movimientoId: "id-Sueldo-2026-09-30", pagado: false }),
    ]);
  });

  it("una serie detenida (el último ya no se repite) no aparece", () => {
    const pagos = calendarioDePagos({ ...base, movimientos: [m("Gym", "2026-08-10", true), m("Gym", "2026-09-10", false)], deudas: [] });
    expect(pagos).toEqual([]);
  });

  it("cuotas de deudas abiertas, marcadas como pagadas si hubo un pago vinculado", () => {
    const deudas = [
      { id: "d1", nombre: "Visa", cuota_mensual: 250, dia_pago: 5, moneda: "PEN", cerrada: false },
      { id: "d2", nombre: "Préstamo", cuota_mensual: 100, dia_pago: 31, moneda: "PEN", cerrada: false },
      { id: "d3", nombre: "Vieja", cuota_mensual: 50, dia_pago: 10, moneda: "PEN", cerrada: true },
    ];
    const pagos = calendarioDePagos({ ...base, movimientos: [m("Pago Visa", "2026-10-04", false, "d1")], deudas });
    expect(pagos.map((p) => [p.fecha, p.concepto, p.pagado])).toEqual([
      ["2026-10-05", "Visa", true],
      ["2026-10-31", "Préstamo", false],
    ]);
  });

  it("un periodo que cruza dos meses (cobras el 15)", () => {
    const deudas = [{ id: "d1", nombre: "Visa", cuota_mensual: 250, dia_pago: 5, moneda: "PEN", cerrada: false }];
    const pagos = calendarioDePagos({ desde: "2026-10-15", hasta: "2026-11-14", movimientos: [], deudas });
    expect(pagos.map((p) => p.fecha)).toEqual(["2026-11-05"]);
  });
});

describe("variacion", () => {
  it("porcentaje frente al periodo anterior", () => {
    expect(variacion(120, 100)).toBe(20);
    expect(variacion(50, 100)).toBe(-50);
    expect(variacion(100, 0)).toBeNull();
    expect(variacion(100, undefined)).toBeNull();
  });
});

describe("reto de 52 semanas", () => {
  it("objetivo = 1378 × monto base", () => {
    expect(objetivoReto(1)).toBe(1378);
    expect(objetivoReto(2)).toBe(2756);
  });

  it("semana y monto que tocan", () => {
    expect(semanaDelReto(2, "2026-10-01", "2026-10-01")).toEqual({ semana: 1, monto: 2, terminado: false });
    expect(semanaDelReto(2, "2026-10-01", "2026-10-08")).toEqual({ semana: 2, monto: 4, terminado: false });
    expect(semanaDelReto(2, "2026-10-01", "2027-09-29")).toEqual({ semana: 52, monto: 104, terminado: false });
    expect(semanaDelReto(2, "2026-10-01", "2027-10-01").terminado).toBe(true);
  });

  it("termina 52 semanas después", () => {
    expect(finDelReto("2026-10-01")).toBe("2027-09-29");
  });
});

describe("gastosHormiga", () => {
  const g = (concepto: string, monto: number, tipo: "GASTO" | "OCIO" | "AHORRO" = "GASTO") => ({ tipo, concepto, monto_base: monto });

  it("agrupa gastos chicos repetidos 3+ veces y los ordena por total", () => {
    const r = gastosHormiga(
      [g("Café", 8), g("café", 8), g("Café ", 9), g("Pasaje", 3), g("Pasaje", 3), g("Pasaje", 3), g("Pasaje", 3), g("Cine", 20), g("Cine", 20)],
      1500,
    );
    expect(r.umbral).toBe(30);
    expect(r.grupos.map((x) => [x.concepto, x.veces, x.total])).toEqual([
      ["Café", 3, 25],
      ["Pasaje", 4, 12],
    ]);
    expect(r.total).toBe(37);
  });

  it("no cuenta gastos grandes ni ahorros", () => {
    const r = gastosHormiga([g("Mercado", 200), g("Mercado", 200), g("Mercado", 200), g("Meta", 5, "AHORRO"), g("Meta", 5, "AHORRO"), g("Meta", 5, "AHORRO")], 1500);
    expect(r.grupos).toEqual([]);
    expect(r.total).toBe(0);
  });

  it("con sueldo bajo o cero usa un umbral mínimo de 10", () => {
    expect(gastosHormiga([], 0).umbral).toBe(10);
  });
});

describe("patrimonioPorMes", () => {
  it("ahorros + te deben − deudas al cierre de cada mes", () => {
    const r = patrimonioPorMes(["2026-09-01", "2026-10-01"], "2026-10-18", {
      aportes: [
        { fecha: "2026-09-10", monto_base: 300 },
        { fecha: "2026-10-05", monto_base: 200 },
      ],
      deudas: [{ id: "d1", monto_total: 1000, creado: "2026-09-01T12:00:00Z", cerrada: false }],
      pagos: [
        { deuda_id: "d1", fecha: "2026-09-20", monto_base: 250 },
        { deuda_id: "d1", fecha: "2026-10-15", monto_base: 250 },
      ],
      prestamos: [{ fecha: "2026-10-01", monto: 50, cobrado: false, cobrado_en: null }],
    });
    expect(r).toEqual([
      { mes: "2026-09-01", ahorros: 300, teDeben: 0, deudas: 750, neto: -450 },
      { mes: "2026-10-01", ahorros: 500, teDeben: 50, deudas: 500, neto: 50 },
    ]);
  });

  it("un préstamo cobrado deja de contar desde la fecha de cobro; una deuda cerrada no cuenta", () => {
    const r = patrimonioPorMes(["2026-09-01", "2026-10-01"], "2026-10-18", {
      aportes: [],
      deudas: [{ id: "d1", monto_total: 500, creado: "2026-08-01", cerrada: true }],
      pagos: [],
      prestamos: [{ fecha: "2026-09-05", monto: 80, cobrado: true, cobrado_en: "2026-10-02" }],
    });
    expect(r.map((p) => p.neto)).toEqual([80, 0]);
  });
});
