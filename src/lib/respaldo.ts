// Respaldo completo en JSON. El plan gratis de Supabase no ofrece copias descargables:
// este archivo es la copia de seguridad del usuario. Sirve para restaurar todo si algo se borra.
// No incluye correo, suscripciones push ni el token del Atajo (son datos del dispositivo o secretos).

export const VERSION_RESPALDO = 1;

type Fila = Record<string, unknown>;

/** Quita el user_id: el respaldo no depende de la cuenta y se puede restaurar en otra. */
function sinDueno(filas: Fila[]): Fila[] {
  return filas.map((f) => Object.fromEntries(Object.entries(f).filter(([campo]) => campo !== "user_id")));
}

export function armarRespaldo(datos: {
  hoy: string;
  perfil: { sueldo_mensual: number; moneda_base: string; moneda_sueldo: string; dia_pago: number };
  categorias: Fila[];
  metas: Fila[];
  deudas: Fila[];
  movimientos: Fila[];
}) {
  return {
    app: "SaveWise",
    version: VERSION_RESPALDO,
    fecha: datos.hoy,
    perfil: {
      sueldo_mensual: datos.perfil.sueldo_mensual,
      moneda_base: datos.perfil.moneda_base,
      moneda_sueldo: datos.perfil.moneda_sueldo,
      dia_pago: datos.perfil.dia_pago,
    },
    cantidades: {
      categorias: datos.categorias.length,
      metas: datos.metas.length,
      deudas: datos.deudas.length,
      movimientos: datos.movimientos.length,
    },
    categorias: sinDueno(datos.categorias),
    metas: sinDueno(datos.metas),
    deudas: sinDueno(datos.deudas),
    movimientos: sinDueno(datos.movimientos),
  };
}
