import { describe, expect, it } from "vitest";
import { generarConsejos } from "./consejos";
import { calcularResumen, cuotaMensual, formatearDinero, fraccion, paraMiPorDia } from "./dinero";
import { fechaLarga, mesesHasta, rangoDelMes } from "./fechas";

// Ejemplo de la propuesta: sueldo S/ 1,500.
const movimientos = [
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

describe("calcularResumen", () => {
  const r = calcularResumen(1500, movimientos);

  it("reparte el sueldo como en la propuesta", () => {
    expect(r.gastos).toBe(598.12);
    expect(r.ahorros).toBe(300);
    expect(r.paraMi).toBe(250);
    expect(r.sinAsignar).toBe(351.88);
  });

  it("el ocio resta de Para mí, no otra vez del sueldo", () => {
    expect(r.ocio).toBe(103.5);
    expect(r.paraMiRestante).toBe(146.5);
  });

  it("suma ingresos extra al sueldo", () => {
    expect(calcularResumen(1500, [{ tipo: "INGRESO", monto_base: 200 }]).sinAsignar).toBe(1700);
  });

  it("no acumula errores de coma flotante", () => {
    const muchos = Array.from({ length: 10 }, () => ({ tipo: "GASTO" as const, monto_base: 0.1 }));
    expect(calcularResumen(1, muchos).sinAsignar).toBe(0);
  });
});

describe("cálculos de metas y Para mí", () => {
  const octubre = rangoDelMes("2026-10-17");

  it("Para mí por día: S/ 146.50 en 15 días", () => {
    expect(octubre.diasRestantes).toBe(15);
    expect(paraMiPorDia(146.5, octubre)).toBe(9.76);
  });

  it("cuota de Navidad: faltan S/ 400 hasta diciembre", () => {
    expect(mesesHasta("2026-10-17", "2026-12-24")).toBe(3);
    expect(cuotaMensual(400, "2026-10-17", "2026-12-24")).toBe(133.34);
    expect(cuotaMensual(400, "2026-10-17", null)).toBeNull();
  });

  it("fracción acotada entre 0 y 1", () => {
    expect(fraccion(50, 0)).toBe(0);
    expect(fraccion(200, 100)).toBe(1);
  });
});

describe("formato", () => {
  it("muestra soles con formato peruano", () => {
    expect(formatearDinero(1500)).toMatch(/S\/\s?1,500\.00/);
  });

  it("fecha larga en español", () => {
    expect(fechaLarga("2026-10-17")).toBe("Sábado 17 de octubre");
  });
});

describe("generarConsejos", () => {
  it("con el ejemplo: ahorra 20%, Para mí va bien y hay dinero sin destino", () => {
    const r = calcularResumen(1500, movimientos);
    const ids = generarConsejos(r, rangoDelMes("2026-10-17")).map((c) => c.id);
    expect(ids).toEqual(["ritmo-para-mi", "ahorro", "sin-destino"]);
  });

  it("avisa cuando los gastos pasan la mitad del sueldo", () => {
    const r = calcularResumen(1000, [{ tipo: "GASTO", monto_base: 600 }]);
    expect(generarConsejos(r, rangoDelMes("2026-10-17"))[0]?.id).toBe("gastos-altos");
  });
});
