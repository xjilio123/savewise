import type { ColorApp, TipoMovimiento } from "@/lib/supabase/tipos";

type Clases = { texto: string; trazo: string; suave: string; punto: string };

// Clases completas (Tailwind solo genera las que aparecen escritas tal cual).
export const CLASES_COLOR: Record<ColorApp, Clases> = {
  rojo: { texto: "text-rojo", trazo: "text-rojo-relleno", suave: "bg-rojo-relleno/15", punto: "bg-rojo-relleno" },
  azul: { texto: "text-azul", trazo: "text-azul", suave: "bg-azul-relleno/15", punto: "bg-azul" },
  verde: { texto: "text-verde", trazo: "text-verde-relleno", suave: "bg-verde-relleno/15", punto: "bg-verde-relleno" },
  morado: { texto: "text-morado", trazo: "text-morado-relleno", suave: "bg-morado-relleno/15", punto: "bg-morado-relleno" },
  negro: { texto: "text-negro", trazo: "text-negro", suave: "bg-negro/10", punto: "bg-negro" },
  naranja: { texto: "text-naranja", trazo: "text-naranja-relleno", suave: "bg-naranja-relleno/15", punto: "bg-naranja-relleno" },
  rosa: { texto: "text-rosa", trazo: "text-rosa-relleno", suave: "bg-rosa-relleno/15", punto: "bg-rosa-relleno" },
  turquesa: { texto: "text-turquesa", trazo: "text-turquesa-relleno", suave: "bg-turquesa-relleno/15", punto: "bg-turquesa-relleno" },
  indigo: { texto: "text-indigo", trazo: "text-indigo-relleno", suave: "bg-indigo-relleno/15", punto: "bg-indigo-relleno" },
  gris: { texto: "text-gris", trazo: "text-gris-relleno", suave: "bg-gris-relleno/15", punto: "bg-gris-relleno" },
  amarillo: { texto: "text-amarillo", trazo: "text-amarillo-relleno", suave: "bg-amarillo-relleno/20", punto: "bg-amarillo-relleno" },
  menta: { texto: "text-menta", trazo: "text-menta-relleno", suave: "bg-menta-relleno/15", punto: "bg-menta-relleno" },
  marron: { texto: "text-marron", trazo: "text-marron-relleno", suave: "bg-marron-relleno/15", punto: "bg-marron-relleno" },
};

/** Colores que puede usar una categoría (el gris queda para "Sin categoría"). Uno por categoría. */
export const COLORES_CATEGORIA = [
  "rojo",
  "naranja",
  "amarillo",
  "verde",
  "menta",
  "turquesa",
  "azul",
  "indigo",
  "morado",
  "rosa",
  "marron",
  "negro",
] as const satisfies readonly ColorApp[];

export const NOMBRE_COLOR: Record<(typeof COLORES_CATEGORIA)[number], string> = {
  rojo: "Rojo",
  naranja: "Naranja",
  amarillo: "Amarillo",
  verde: "Verde",
  menta: "Menta",
  turquesa: "Turquesa",
  azul: "Azul",
  indigo: "Índigo",
  morado: "Morado",
  rosa: "Rosa",
  marron: "Marrón",
  negro: "Negro",
};

export const COLOR_TIPO: Record<TipoMovimiento, ColorApp> = {
  GASTO: "rojo",
  OCIO: "morado",
  PARA_MI: "morado",
  AHORRO: "verde",
  INGRESO: "azul",
};

export const NOMBRE_TIPO: Record<TipoMovimiento, string> = {
  GASTO: "Gasto",
  OCIO: "Para mí",
  PARA_MI: "Bolsa Para mí",
  AHORRO: "Ahorro",
  INGRESO: "Ingreso",
};

/** Signo con el que se muestra cada tipo en las listas. */
export const SIGNO_TIPO: Record<TipoMovimiento, string> = {
  GASTO: "−",
  OCIO: "−",
  PARA_MI: "",
  AHORRO: "",
  INGRESO: "+",
};
