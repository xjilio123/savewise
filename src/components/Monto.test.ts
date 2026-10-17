import { describe, expect, it } from "vitest";
import { formatearDinero } from "@/lib/dinero";
import { partirMontos, simboloDe } from "./Monto";

describe("partirMontos", () => {
  it("separa solo los montos y deja el resto del texto", () => {
    const texto = `Tus gastos ya son ${formatearDinero(890.2)} de ${formatearDinero(1500)}.`;
    const partes = partirMontos(texto);
    expect(partes.filter((p) => p.esMonto).map((p) => p.texto)).toEqual([formatearDinero(890.2), formatearDinero(1500)]);
    expect(partes.map((p) => p.texto).join("")).toBe(texto);
  });

  it("no toma porcentajes, números sueltos ni la TEA", () => {
    expect(partirMontos("Usaste 41% con 55% del mes; 12 días · TEA 65%").every((p) => !p.esMonto)).toBe(true);
  });

  it("reconoce montos que escribe la IA con el código de moneda", () => {
    expect(partirMontos("Llevas PEN 890.20 gastados").filter((p) => p.esMonto).map((p) => p.texto)).toEqual(["PEN 890.20"]);
  });

  it("reconoce otras monedas", () => {
    for (const moneda of ["USD", "EUR", "COP", "ARS"]) {
      const m = formatearDinero(10, moneda);
      expect(partirMontos(`Pago de ${m}`).some((p) => p.esMonto && p.texto === m)).toBe(true);
    }
  });
});

describe("simboloDe", () => {
  it("extrae el símbolo del monto formateado", () => {
    expect(simboloDe(formatearDinero(1500))).toBe("S/");
    expect(simboloDe(formatearDinero(-25))).toBe("S/");
    expect(simboloDe(formatearDinero(10, "USD"))).toBe("USD");
  });
});
