import { describe, expect, it } from "vitest";
import { proyectarMeta, sobranteDelPeriodo, sugerirFondoEmergencia } from "./planificacion";

describe("sugerirFondoEmergencia", () => {
  it("sugiere de 3 a 6 meses de gastos promedio", () => {
    expect(sugerirFondoEmergencia([598.12, 0, 601.88])).toEqual({ gastoMensual: 600, minimo: 1800, ideal: 3600 });
  });

  it("sin gastos no sugiere nada", () => {
    expect(sugerirFondoEmergencia([0, 0])).toBeNull();
    expect(sugerirFondoEmergencia([])).toBeNull();
  });
});

describe("proyectarMeta", () => {
  const base = { ahorrado: 400, objetivo: 800, hoy: "2026-10-17", fechaObjetivo: "2026-12-24" };

  it("con S/ 200 al mes, Navidad se completa en diciembre y llega a tiempo", () => {
    const p = proyectarMeta({ ...base, aportesUltimosMeses: [200, 200, 200] });
    expect(p).toEqual({ ritmoMensual: 200, alCierreDelAnio: 800, llegaATiempo: true, mesEstimado: "2026-12" });
  });

  it("con S/ 100 al mes no llega a tiempo", () => {
    const p = proyectarMeta({ ...base, aportesUltimosMeses: [100, 100, 100] });
    expect(p.mesEstimado).toBe("2027-02");
    expect(p.llegaATiempo).toBe(false);
  });

  it("sin aportes recientes no hay fecha estimada", () => {
    const p = proyectarMeta({ ...base, aportesUltimosMeses: [0, 0, 0] });
    expect(p.mesEstimado).toBeNull();
    expect(p.llegaATiempo).toBe(false);
    expect(p.alCierreDelAnio).toBe(400);
  });

  it("una meta cumplida se marca en el mes actual", () => {
    expect(proyectarMeta({ ...base, ahorrado: 800, aportesUltimosMeses: [] }).mesEstimado).toBe("2026-10");
  });

  it("sin fecha límite no evalúa si llega a tiempo", () => {
    expect(proyectarMeta({ ...base, fechaObjetivo: null, aportesUltimosMeses: [50] }).llegaATiempo).toBeNull();
  });
});

describe("sobranteDelPeriodo", () => {
  it("ofrece cerrar lo que sobró si el periodo tuvo movimientos", () => {
    expect(sobranteDelPeriodo(351.88, 11)).toBe(351.88);
  });

  it("no ofrece nada si no usabas la app o no sobró", () => {
    expect(sobranteDelPeriodo(1500, 0)).toBe(0);
    expect(sobranteDelPeriodo(-20, 5)).toBe(0);
  });
});
