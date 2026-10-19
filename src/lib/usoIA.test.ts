import { describe, expect, it } from "vitest";
import { formatoEspera, mensajeBloqueo, restantesIA, siguienteEstadoIA, type EstadoIA } from "./usoIA";

describe("formatoEspera", () => {
  it.each([
    [120, "2:00"],
    [95, "1:35"],
    [15, "0:15"],
    [0.2, "0:01"],
    [-3, "0:00"],
  ])("%s s → %s", (segundos, texto) => {
    expect(formatoEspera(segundos)).toBe(texto);
  });
});

describe("restantesIA", () => {
  it("cuenta cuántos quedan hoy, sin bajar de 0", () => {
    expect(restantesIA(0)).toBe(10);
    expect(restantesIA(7)).toBe(3);
    expect(restantesIA(12)).toBe(0);
  });
});

describe("mensajeBloqueo", () => {
  it("explica el tope diario y el pedido en curso; la espera se ve en el botón", () => {
    expect(mensajeBloqueo("tope")).toMatch(/10 resúmenes de hoy/);
    expect(mensajeBloqueo("en_curso")).toMatch(/generando/);
    expect(mensajeBloqueo("espera")).toBeUndefined();
  });
});

describe("siguienteEstadoIA", () => {
  const previo: EstadoIA = { texto: "Vas bien.", usados: 3, espera: 0, marca: 1 };

  it("un resumen nuevo reemplaza al anterior", () => {
    expect(siguienteEstadoIA(previo, { texto: "Nuevo.", usados: 4, espera: 120 }, 2)).toEqual({
      texto: "Nuevo.",
      error: undefined,
      usados: 4,
      espera: 120,
      marca: 2,
    });
  });

  it("un error no borra el último resumen ni el contador", () => {
    expect(siguienteEstadoIA(previo, { error: "La IA no respondió.", espera: 15 }, 2)).toEqual({
      texto: "Vas bien.",
      error: "La IA no respondió.",
      usados: 3,
      espera: 15,
      marca: 2,
    });
  });
});
