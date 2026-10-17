import { describe, expect, it } from "vitest";
import { planDeuda, saldoDeuda, tasaMensual } from "./deudas";
import { esquemaDeuda } from "./validacion";

describe("planDeuda", () => {
  it("sin interés: S/ 1,200 con cuotas de S/ 100 son 12 meses", () => {
    expect(planDeuda(1200, 100, null)).toEqual({ meses: 12, sinFin: false });
    expect(planDeuda(1200, 100, 0)).toEqual({ meses: 12, sinFin: false });
  });

  it("con TEA de 60% la misma deuda toma 17 meses", () => {
    expect(planDeuda(1200, 100, 60)).toEqual({ meses: 17, sinFin: false });
  });

  it("avisa cuando la cuota no cubre ni los intereses", () => {
    expect(planDeuda(1200, 40, 60)).toEqual({ meses: null, sinFin: true });
  });

  it("deuda pagada o sin cuota", () => {
    expect(planDeuda(0, 100, 60)).toEqual({ meses: 0, sinFin: false });
    expect(planDeuda(500, null, 60)).toEqual({ meses: null, sinFin: false });
  });

  it("tasa mensual equivalente a la TEA", () => {
    expect(tasaMensual(60)).toBeCloseTo(0.03994, 5);
  });

  it("saldo aproximado nunca es negativo", () => {
    expect(saldoDeuda(1200, 300)).toBe(900);
    expect(saldoDeuda(1200, 1500)).toBe(0);
  });
});

describe("esquemaDeuda", () => {
  it("acepta una tarjeta con TEA y día de pago", () => {
    const d = esquemaDeuda.parse({ nombre: "Visa", tipo: "tarjeta", monto_total: "2500", cuota_mensual: "250", dia_pago: "5", tea: "65.5" });
    expect(d).toMatchObject({ monto_total: 2500, cuota_mensual: 250, dia_pago: 5, tea: 65.5 });
  });

  it("campos opcionales vacíos quedan en null", () => {
    const d = esquemaDeuda.parse({ nombre: "Préstamo", tipo: "prestamo", monto_total: "1000", cuota_mensual: "", dia_pago: "", tea: "" });
    expect(d).toMatchObject({ cuota_mensual: null, dia_pago: null, tea: null });
  });

  it.each([
    { nombre: "", tipo: "tarjeta", monto_total: "100" },
    { nombre: "X", tipo: "hipoteca", monto_total: "100" },
    { nombre: "X", tipo: "tarjeta", monto_total: "-1" },
    { nombre: "X", tipo: "tarjeta", monto_total: "100", dia_pago: "40" },
    { nombre: "X", tipo: "tarjeta", monto_total: "100", tea: "5000" },
  ])("rechaza %o", (datos) => {
    expect(esquemaDeuda.safeParse({ cuota_mensual: "", dia_pago: "", tea: "", ...datos }).success).toBe(false);
  });
});
