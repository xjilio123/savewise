import { describe, expect, it } from "vitest";
import { clasesCirculoPerfil, COLORES_CATEGORIA, comoColorPerfil, fondoColorPerfil } from "./colores";
import { esquemaColorPerfil } from "./validacion";

describe("círculo de perfil", () => {
  it("sin color usa el degradado de siempre con letra blanca", () => {
    expect(clasesCirculoPerfil(null)).toBe("bg-gradient-to-br from-heroe-desde to-heroe-hasta text-white");
  });

  it("en los colores claros la letra va oscura y en el resto blanca", () => {
    for (const c of ["naranja", "amarillo", "verde", "menta", "turquesa"] as const) {
      expect(clasesCirculoPerfil(c)).toContain("text-[#1d1d1f]");
    }
    for (const c of ["rojo", "azul", "indigo", "morado", "rosa", "marron"] as const) {
      expect(clasesCirculoPerfil(c)).toContain("text-white");
    }
  });

  it("en Negro la letra sigue al tema (Negro es gris claro en modo oscuro)", () => {
    expect(clasesCirculoPerfil("negro")).toBe("bg-negro text-tarjeta");
  });

  it("cada color usa su propio fondo", () => {
    const fondos = COLORES_CATEGORIA.map(fondoColorPerfil);
    expect(new Set(fondos).size).toBe(COLORES_CATEGORIA.length);
    for (const c of COLORES_CATEGORIA) expect(clasesCirculoPerfil(c)).toContain(fondoColorPerfil(c));
  });

  it("lo que viene de la base: el gris o vacío cuentan como Original", () => {
    expect(comoColorPerfil("verde")).toBe("verde");
    expect(comoColorPerfil("gris")).toBeNull();
    expect(comoColorPerfil(null)).toBeNull();
    expect(comoColorPerfil(undefined)).toBeNull();
  });
});

describe("esquemaColorPerfil", () => {
  it("acepta los 12 colores y Original (que se guarda vacío)", () => {
    for (const c of COLORES_CATEGORIA) expect(esquemaColorPerfil.parse(c)).toBe(c);
    expect(esquemaColorPerfil.parse("original")).toBeNull();
  });

  it("rechaza el gris y cualquier otro valor", () => {
    for (const malo of ["gris", "", "ROJO", "#ff0000", "rojo; drop table"]) {
      expect(esquemaColorPerfil.safeParse(malo).success).toBe(false);
    }
  });
});
