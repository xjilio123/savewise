import { describe, expect, it } from "vitest";
import { armarRespaldo, VERSION_RESPALDO } from "./respaldo";

const base = {
  hoy: "2026-10-17",
  perfil: { sueldo_mensual: 1500, moneda_base: "PEN", moneda_sueldo: "PEN", dia_pago: 1, nombre: "Joaquín", id: "u1" },
  categorias: [{ id: "c1", user_id: "u1", nombre: "Salud", tope: null }],
  metas: [{ id: "m1", user_id: "u1", nombre: "Navidad", objetivo: 500 }],
  deudas: [],
  movimientos: [
    { id: "x1", user_id: "u1", concepto: "Farmacia", monto: 50, categoria_id: "c1" },
    { id: "x2", user_id: "u1", concepto: "Aporte", monto: 100, meta_id: "m1" },
  ],
};

describe("armarRespaldo", () => {
  it("incluye todo lo necesario para restaurar, con cantidades para verificar", () => {
    const r = armarRespaldo(base);
    expect(r).toMatchObject({ app: "SaveWise", version: VERSION_RESPALDO, fecha: "2026-10-17" });
    expect(r.cantidades).toEqual({ categorias: 1, metas: 1, deudas: 0, movimientos: 2, prestamos: 0 });
    expect(r.movimientos[0]).toEqual({ id: "x1", concepto: "Farmacia", monto: 50, categoria_id: "c1" });
  });

  it("no guarda el user_id ni datos de la cuenta", () => {
    const texto = JSON.stringify(armarRespaldo(base));
    expect(texto).not.toContain("user_id");
    expect(texto).not.toContain("u1");
    expect(texto).not.toContain("Joaquín");
  });
});
