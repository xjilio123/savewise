import { describe, expect, it } from "vitest";
import {
  avisoRespaldo,
  CUPO_PERSONA,
  diasDesdeRespaldo,
  estadoEspacio,
  formatoMB,
  LIMITE_BASE,
  textoConteos,
  textoUltimoRespaldo,
} from "./espacio";

const MB = 1024 * 1024;

describe("formatoMB", () => {
  it("un decimal por debajo de 10 MB, entero desde ahí", () => {
    expect(formatoMB(0.6 * MB)).toBe("0.6 MB");
    expect(formatoMB(15 * MB)).toBe("15 MB");
    expect(formatoMB(500 * MB)).toBe("500 MB");
    expect(formatoMB(20_000)).toBe("menos de 0.1 MB");
  });
});

describe("estadoEspacio", () => {
  it("bien por debajo del 70%, pronto del 70% al 89% y lleno desde el 90%", () => {
    expect(estadoEspacio(0.6 * MB, CUPO_PERSONA)).toMatchObject({ nivel: "bien", resumen: "4% usado · Todo bien" });
    expect(estadoEspacio(10.5 * MB, CUPO_PERSONA).nivel).toBe("pronto");
    expect(estadoEspacio(13.4 * MB, CUPO_PERSONA).nivel).toBe("pronto");
    expect(estadoEspacio(13.5 * MB, CUPO_PERSONA)).toMatchObject({ nivel: "lleno", resumen: "90% usado · Casi lleno" });
  });

  it("muy poco uso dice «menos de 1%», no 0%", () => {
    expect(estadoEspacio(50_000, CUPO_PERSONA).resumen).toBe("Menos de 1% usado · Todo bien");
    expect(estadoEspacio(0, CUPO_PERSONA).resumen).toBe("0% usado · Todo bien");
  });

  it("el total de la base avisa desde el 80%", () => {
    expect(estadoEspacio(14 * MB, LIMITE_BASE, 0.8)).toMatchObject({ nivel: "bien", usado: "14 MB", total: "500 MB" });
    expect(estadoEspacio(400 * MB, LIMITE_BASE, 0.8).nivel).toBe("lleno");
  });
});

describe("último respaldo", () => {
  const ahora = new Date("2026-11-10T15:00:00Z");

  it("cuenta días completos y dice hoy, ayer o hace N días", () => {
    expect(diasDesdeRespaldo(null, ahora)).toBeNull();
    expect(textoUltimoRespaldo(diasDesdeRespaldo("2026-11-10T09:00:00Z", ahora))).toBe("Último respaldo: hoy");
    expect(textoUltimoRespaldo(diasDesdeRespaldo("2026-11-09T09:00:00Z", ahora))).toBe("Último respaldo: ayer");
    expect(textoUltimoRespaldo(diasDesdeRespaldo("2026-10-29T15:00:00Z", ahora))).toBe("Último respaldo: hace 12 días");
    expect(textoUltimoRespaldo(null)).toBe("Aún no descargas un respaldo");
  });

  it("avisa desde los 30 días o si nunca se descargó", () => {
    expect(avisoRespaldo(29)).toBeNull();
    expect(avisoRespaldo(45)).toBe("Hace 45 días que no descargas un respaldo.");
    expect(avisoRespaldo(null)).toContain("Aún no descargas");
  });
});

describe("textoConteos", () => {
  it("con separador de miles, singular y sin deudas si no hay", () => {
    expect(textoConteos({ movimientos: 1240, metas: 5, deudas: 2 })).toBe("1,240 movimientos · 5 metas · 2 deudas");
    expect(textoConteos({ movimientos: 1, metas: 1, deudas: 0 })).toBe("1 movimiento · 1 meta");
  });
});
