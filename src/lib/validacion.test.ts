import { describe, expect, it } from "vitest";
import {
  erroresPorCampo,
  esquemaMeta,
  esquemaMovimiento,
  esquemaPerfil,
  limpiarDia,
  limpiarMonto,
  pideConfirmarSueldo,
} from "./validacion";

const base = {
  tipo: "GASTO",
  monto: "8.22",
  concepto: "Spotify",
  fecha: "2026-10-12",
  categoria_id: "",
  meta_id: "",
  recurrente: true,
};

describe("esquemaMovimiento", () => {
  it("acepta un gasto válido y convierte el monto a número", () => {
    const r = esquemaMovimiento.parse(base);
    expect(r.monto).toBe(8.22);
    expect(r.categoria_id).toBeNull();
  });

  it.each([
    ["negativo", "-5"],
    ["cero", "0"],
    ["tres decimales", "1.234"],
    ["gigante", "1e12"],
    ["con letras", "12abc"],
    ["vacío", ""],
  ])("rechaza un monto %s", (_, monto) => {
    expect(esquemaMovimiento.safeParse({ ...base, monto }).success).toBe(false);
  });

  it("guarda texto con <script> como texto, sin interpretarlo", () => {
    const r = esquemaMovimiento.parse({ ...base, concepto: "<script>alert(1)</script>" });
    expect(r.concepto).toBe("<script>alert(1)</script>");
  });

  it("rechaza conceptos de más de 80 caracteres", () => {
    expect(esquemaMovimiento.safeParse({ ...base, concepto: "x".repeat(81) }).success).toBe(false);
  });

  it("rechaza ids que no son UUID (inyección en el filtro)", () => {
    const r = esquemaMovimiento.safeParse({ ...base, categoria_id: "1' OR '1'='1" });
    expect(r.success).toBe(false);
  });

  it("rechaza tipos inventados y fechas inválidas", () => {
    expect(esquemaMovimiento.safeParse({ ...base, tipo: "ROBO" }).success).toBe(false);
    expect(esquemaMovimiento.safeParse({ ...base, fecha: "2026-13-40" }).success).toBe(false);
  });

  it("un ahorro necesita una meta", () => {
    const r = esquemaMovimiento.safeParse({ ...base, tipo: "AHORRO" });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresPorCampo(r.error).meta_id).toBe("Elige la meta de este ahorro");
  });
});

describe("esquemaPerfil", () => {
  it("acepta tu sueldo de S/ 1,500", () => {
    expect(esquemaPerfil.parse({ sueldo_mensual: "1500", moneda_base: "PEN", dia_pago: "1" })).toEqual({
      sueldo_mensual: 1500,
      moneda_base: "PEN",
      dia_pago: 1,
    });
  });

  it("rechaza monedas no soportadas y días fuera de rango", () => {
    expect(esquemaPerfil.safeParse({ sueldo_mensual: "1500", moneda_base: "XYZ", dia_pago: "1" }).success).toBe(false);
    expect(esquemaPerfil.safeParse({ sueldo_mensual: "1500", moneda_base: "PEN", dia_pago: "32" }).success).toBe(false);
  });
});

describe("montos con coma", () => {
  it.each([
    ["coma decimal", "1500,50", 1500.5],
    ["formato peruano con miles", "1,500.00", 1500],
    ["con espacios", " 1500 ", 1500],
  ])("acepta %s", (_, sueldo, esperado) => {
    expect(esquemaPerfil.parse({ sueldo_mensual: sueldo, moneda_base: "PEN", dia_pago: "1" }).sueldo_mensual).toBe(esperado);
  });

  it("sigue rechazando 3 decimales también con coma", () => {
    expect(esquemaPerfil.safeParse({ sueldo_mensual: "1500,505", moneda_base: "PEN", dia_pago: "1" }).success).toBe(false);
  });
});

describe("limpiarMonto (lo que deja escribir el campo)", () => {
  it.each([
    ["1500.505", "1500.50"],
    ["1500,5", "1500.5"],
    ["15a00", "1500"],
    ["1.5.0", "1.50"],
    ["-200", "200"],
    ["9999999999", "999999999"],
    ["", ""],
  ])("%s → %s", (escrito, queda) => {
    expect(limpiarMonto(escrito)).toBe(queda);
  });
});

describe("limpiarDia (lo que deja escribir el campo)", () => {
  it.each([
    ["1", "1"],
    ["31", "31"],
    ["32", "3"],
    ["45", "4"],
    ["123", "12"],
    ["1a", "1"],
  ])("%s → %s", (escrito, queda) => {
    expect(limpiarDia(escrito)).toBe(queda);
  });
});

describe("pideConfirmarSueldo", () => {
  it("avisa si el sueldo parece un error al escribirlo (0.40 en vez de 400)", () => {
    expect(pideConfirmarSueldo(0.4, "")).toBe(true);
    expect(pideConfirmarSueldo(9.99, "")).toBe(true);
  });

  it("no avisa con un sueldo normal", () => {
    expect(pideConfirmarSueldo(10, "")).toBe(false);
    expect(pideConfirmarSueldo(1500, "")).toBe(false);
  });

  it("deja guardar si se confirma el mismo monto, pero vuelve a avisar si lo cambia por otro bajo", () => {
    expect(pideConfirmarSueldo(0.4, "0.4")).toBe(false);
    expect(pideConfirmarSueldo(0.5, "0.4")).toBe(true);
  });
});

describe("esquemaMeta", () => {
  it("acepta una meta sin fecha", () => {
    expect(esquemaMeta.parse({ nombre: "Navidad", objetivo: "800", fecha_objetivo: "" }).fecha_objetivo).toBeNull();
  });
});
