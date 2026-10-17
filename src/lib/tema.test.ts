import { describe, expect, it } from "vitest";
import { coloresDeTema, leerTema } from "./tema";

describe("leerTema", () => {
  it("acepta los tres temas", () => {
    expect(leerTema("auto")).toBe("auto");
    expect(leerTema("claro")).toBe("claro");
    expect(leerTema("oscuro")).toBe("oscuro");
  });

  it("valores ausentes o manipulados vuelven a automático", () => {
    expect(leerTema(undefined)).toBe("auto");
    expect(leerTema("")).toBe("auto");
    expect(leerTema('oscuro" onload="x')).toBe("auto");
  });
});

describe("coloresDeTema", () => {
  it("automático usa un color por modo del iPhone", () => {
    expect(coloresDeTema("auto")).toHaveLength(2);
  });

  it("un tema fijo usa un solo color", () => {
    expect(coloresDeTema("claro")).toEqual([{ color: "#f2f2f7" }]);
    expect(coloresDeTema("oscuro")).toEqual([{ color: "#000000" }]);
  });
});
