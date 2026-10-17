import { describe, expect, it } from "vitest";
import { aCsv, celdaSegura } from "./csv";

describe("celdaSegura (inyección de fórmulas)", () => {
  it.each([
    ["=HYPERLINK(\"http://malo\",\"clic\")", "\"'=HYPERLINK(\"\"http://malo\"\",\"\"clic\"\")\""],
    ["+51 999", "'+51 999"],
    ["-1+1", "'-1+1"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\t=1", "'\t=1"],
  ])("neutraliza %s", (entrada, salida) => {
    expect(celdaSegura(entrada)).toBe(salida);
  });

  it("deja intactos los números, incluidos los negativos", () => {
    expect(celdaSegura(8.22)).toBe("8.22");
    expect(celdaSegura(-5)).toBe("-5");
  });

  it("escapa comillas, comas y saltos de línea", () => {
    expect(celdaSegura('Café "bueno", grande')).toBe('"Café ""bueno"", grande"');
    expect(celdaSegura("dos\nlíneas")).toBe('"dos\nlíneas"');
  });

  it("vacíos y booleanos", () => {
    expect(celdaSegura(null)).toBe("");
    expect(celdaSegura(true)).toBe("sí");
  });
});

describe("aCsv", () => {
  it("arma el archivo con BOM y CRLF", () => {
    expect(aCsv(["fecha", "monto"], [["2026-10-12", 8.22]])).toBe("﻿fecha,monto\r\n2026-10-12,8.22\r\n");
  });
});
