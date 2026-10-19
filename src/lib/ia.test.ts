import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cuerpoPeticion,
  extraerTexto,
  MODELO_POR_DEFECTO,
  modeloValido,
  pedirResumen,
  simboloMoneda,
  type DatosIA,
} from "./ia";

const datos: DatosIA = {
  periodo: "1 oct – 31 oct",
  diasTranscurridos: 17,
  diasDelPeriodo: 31,
  moneda: "PEN",
  sueldo: 1500,
  actual: { ingresos: 1500, gastos: 612.345, ahorros: 300, paraMi: 150, ocio: 80, sinAsignar: 507.66, paraMiRestante: 70 },
  anterior: { gastos: 700, ahorros: 250, ocio: 120 },
  categorias: [{ nombre: "Alimentación", total: 320.5, tope: 400 }, { nombre: "Transporte", total: 90 }],
  deudas: { pendiente: 2000, cuotasMensuales: 250 },
};

describe("cuerpoPeticion", () => {
  it("solo envía cifras agregadas y nombres de categorías", () => {
    const cuerpo = cuerpoPeticion(datos);
    const enviado = JSON.parse(cuerpo.contents[0]!.parts[0]!.text);
    expect(Object.keys(enviado).sort()).toEqual(
      [
        "deudas",
        "dias",
        "gastos_por_categoria",
        "moneda",
        "periodo",
        "periodo_anterior",
        "simbolo",
        "sueldo",
        "este_periodo",
      ].sort(),
    );
    expect(enviado.este_periodo.gastos).toBe(612.35);
    expect(enviado.gastos_por_categoria[0]).toEqual({ categoria: "Alimentación", total: 320.5, tope: 400 });
    expect(enviado.gastos_por_categoria[1]).not.toHaveProperty("tope");
  });

  it("sin historial no manda periodo anterior y usa el símbolo local", () => {
    const vacio = { ...datos, anterior: { gastos: 0, ahorros: 0, ocio: 0 } };
    const enviado = JSON.parse(cuerpoPeticion(vacio).contents[0]!.parts[0]!.text);
    expect(enviado.periodo_anterior).toBeNull();
    expect(enviado.simbolo).toBe("S/");
    expect(simboloMoneda("XYZ1")).toBe("XYZ1");
  });

  it("limita la cantidad y el largo de las categorías", () => {
    const muchas = Array.from({ length: 12 }, (_, i) => ({ nombre: `C${i}`.padEnd(80, "x"), total: i }));
    const enviado = JSON.parse(cuerpoPeticion({ ...datos, categorias: muchas }).contents[0]!.parts[0]!.text);
    expect(enviado.gastos_por_categoria).toHaveLength(8);
    expect(enviado.gastos_por_categoria[0].categoria).toHaveLength(40);
  });
});

describe("extraerTexto", () => {
  it("une las partes y quita el markdown", () => {
    const r = { candidates: [{ content: { parts: [{ text: "**Vas bien.** " }, { text: "# Gastas menos." }] } }] };
    expect(extraerTexto(r)).toBe("Vas bien. Gastas menos.");
  });

  it("devuelve null ante respuestas vacías, bloqueadas o raras", () => {
    expect(extraerTexto({ promptFeedback: { blockReason: "SAFETY" } })).toBeNull();
    expect(extraerTexto(null)).toBeNull();
    expect(extraerTexto({ candidates: [{ content: { parts: [{ text: 42 }] } }] })).toBeNull();
  });

  it("recorta textos muy largos", () => {
    const largo = extraerTexto({ candidates: [{ content: { parts: [{ text: "a".repeat(5000) }] } }] });
    expect(largo?.length).toBe(1200);
  });
});

describe("modeloValido", () => {
  it("acepta nombres de modelo y rechaza rutas", () => {
    expect(modeloValido("gemini-3.8-flash")).toBe("gemini-3.8-flash");
    expect(modeloValido(undefined)).toBe(MODELO_POR_DEFECTO);
    expect(modeloValido("../../otra/ruta")).toBe(MODELO_POR_DEFECTO);
    expect(modeloValido("gemini?key=x")).toBe(MODELO_POR_DEFECTO);
  });
});

describe("pedirResumen", () => {
  afterEach(() => vi.restoreAllMocks());
  const respuesta = (status: number, cuerpo: unknown = {}) =>
    vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status }));

  it("manda la clave en una cabecera, no en la URL", async () => {
    const f = respuesta(200, { candidates: [{ content: { parts: [{ text: "Todo en orden." }] } }] });
    expect(await pedirResumen(datos, { clave: "clave-secreta", fetch: f })).toEqual({ texto: "Todo en orden." });
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).not.toContain("clave-secreta");
    expect(String(url)).toContain(`/models/${MODELO_POR_DEFECTO}:generateContent`);
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("clave-secreta");
  });

  it("traduce el límite de la capa gratuita y otros errores", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await pedirResumen(datos, { clave: "k", fetch: respuesta(429) })).error).toMatch(/límite gratuito/);
    expect((await pedirResumen(datos, { clave: "k", fetch: respuesta(500), esperaReintento: 0 })).error).toMatch(/no respondió/);
    const caida = vi.fn<typeof fetch>().mockRejectedValue(new Error("red"));
    expect((await pedirResumen(datos, { clave: "k", fetch: caida })).error).toMatch(/conectar/);
  });

  it("si Google está saturado (503) reintenta una vez sola y entrega el resumen", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Vas bien." }] } }] })));
    expect(await pedirResumen(datos, { clave: "k", fetch: f, esperaReintento: 0 })).toEqual({ texto: "Vas bien." });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("no reintenta el límite gratuito (429): gastaría más cupo", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = respuesta(429);
    await pedirResumen(datos, { clave: "k", fetch: f, esperaReintento: 0 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("registra solo el motivo, nunca la clave ni los datos", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = respuesta(200, { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [] } }] });
    expect((await pedirResumen(datos, { clave: "clave-secreta", fetch: f })).error).toMatch(/no devolvió/);
    const registrado = aviso.mock.calls.flat().join(" ");
    expect(registrado).toContain("MAX_TOKENS");
    expect(registrado).not.toContain("clave-secreta");
    expect(registrado).not.toContain(String(datos.sueldo));
  });
});
