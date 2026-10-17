import { describe, expect, it } from "vitest";
import { escaparLike, leerFiltros, paginasVisibles, totalPaginas, urlHistorial } from "./filtros";
import { etiquetaRango, periodoFinanciero, rangoDelMes, rangosRapidos, sumarDias } from "./fechas";
import { extraerTasa } from "./tipoCambio";

describe("periodoFinanciero (día de pago)", () => {
  it("con día de pago 1 es el mes calendario", () => {
    expect(periodoFinanciero("2026-10-17", 1)).toEqual(rangoDelMes("2026-10-17"));
  });

  it("si cobras el 15, el mes va del 15 al 14", () => {
    const p = periodoFinanciero("2026-10-17", 15);
    expect([p.desde, p.hasta, p.diasDelMes, p.diasRestantes]).toEqual(["2026-10-15", "2026-11-14", 31, 29]);
  });

  it("antes del día de pago, sigues en el periodo anterior", () => {
    const p = periodoFinanciero("2026-10-10", 15);
    expect([p.desde, p.hasta]).toEqual(["2026-09-15", "2026-10-14"]);
  });

  it("día 31 en meses cortos usa el último día del mes", () => {
    const p = periodoFinanciero("2026-02-10", 31);
    expect([p.desde, p.hasta]).toEqual(["2026-01-31", "2026-02-27"]);
  });

  it("cruza el cambio de año", () => {
    const p = periodoFinanciero("2027-01-05", 20);
    expect([p.desde, p.hasta]).toEqual(["2026-12-20", "2027-01-19"]);
  });

  it("el día de pago cuenta como día transcurrido", () => {
    const p = periodoFinanciero("2026-10-15", 15);
    expect(p.diasRestantes).toBe(p.diasDelMes);
  });

  it("atajos: periodo actual, anterior y tres periodos", () => {
    const r = rangosRapidos("2026-10-17", 1);
    expect(r.periodo).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
    expect(r.anterior).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(r.tresPeriodos).toEqual({ desde: "2026-08-01", hasta: "2026-10-31" });
  });

  it("formatos de fecha", () => {
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(etiquetaRango("2026-10-01", "2026-10-17")).toBe("1 oct – 17 oct");
  });
});

describe("leerFiltros (parámetros de la URL)", () => {
  const porDefecto = { desde: "2026-10-01", hasta: "2026-10-31" };

  it("sin parámetros usa el periodo actual y la página 1", () => {
    expect(leerFiltros({}, porDefecto)).toEqual({ ...porDefecto, pagina: 1 });
  });

  it("ignora valores inválidos en vez de romper la consulta", () => {
    const f = leerFiltros(
      { desde: "ayer", tipo: "ROBO", categoria: "1' OR '1'='1", pagina: "-3", q: "x".repeat(200) },
      porDefecto,
    );
    expect(f).toEqual({ ...porDefecto, pagina: 1 });
  });

  it("acepta filtros válidos y ordena un rango invertido", () => {
    const f = leerFiltros(
      { desde: "2026-10-17", hasta: "2026-10-01", tipo: "GASTO", q: "  spotify ", pagina: "2" },
      porDefecto,
    );
    expect(f).toEqual({ desde: "2026-10-01", hasta: "2026-10-17", tipo: "GASTO", q: "spotify", pagina: 2 });
  });

  it("si un parámetro viene repetido, usa el primero", () => {
    expect(leerFiltros({ tipo: ["AHORRO", "GASTO"] }, porDefecto).tipo).toBe("AHORRO");
  });

  it("arma la URL omitiendo lo vacío", () => {
    expect(urlHistorial({ desde: "2026-10-01", tipo: "GASTO", pagina: 1 })).toBe("/historial?desde=2026-10-01&tipo=GASTO");
    expect(urlHistorial({})).toBe("/historial");
  });

  it("escapa comodines de búsqueda", () => {
    expect(escaparLike("100%_seguro\\")).toBe("100\\%\\_seguro\\\\");
  });

  it("paginación de 20 en 20 con ventana de 5", () => {
    expect(totalPaginas(46)).toBe(3);
    expect(totalPaginas(0)).toBe(1);
    expect(paginasVisibles(1, 3)).toEqual([1, 2, 3]);
    expect(paginasVisibles(10, 20)).toEqual([8, 9, 10, 11, 12]);
    expect(paginasVisibles(20, 20)).toEqual([16, 17, 18, 19, 20]);
  });
});

describe("extraerTasa (respuesta de la API de tipo de cambio)", () => {
  const ok = { result: "success", base_code: "USD", rates: { PEN: 3.4342, EUR: 0.89 } };

  it("devuelve la tasa pedida", () => {
    expect(extraerTasa(ok, "USD", "PEN")).toBe(3.4342);
  });

  it("rechaza respuestas con forma inesperada o de otra moneda", () => {
    expect(() => extraerTasa({ result: "error" }, "USD", "PEN")).toThrow();
    expect(() => extraerTasa({ ...ok, base_code: "EUR" }, "USD", "PEN")).toThrow();
    expect(() => extraerTasa({ ...ok, rates: { PEN: -1 } }, "USD", "PEN")).toThrow();
    expect(() => extraerTasa(ok, "USD", "JPY")).toThrow();
  });
});
