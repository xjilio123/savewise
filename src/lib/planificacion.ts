// Cálculos de planificación (Fase 5): fondo de emergencia, proyección de metas y cierre de mes.
// Todo en céntimos para evitar errores de coma flotante.

const c = (n: number) => Math.round(n * 100);

export type SugerenciaFondo = { gastoMensual: number; minimo: number; ideal: number };

/**
 * Fondo de emergencia sugerido: de 3 a 6 meses de gastos (sin contar el ocio de Para mí).
 * Usa el promedio de los meses que tienen gastos; sin datos, no sugiere nada.
 */
export function sugerirFondoEmergencia(gastosPorMes: number[]): SugerenciaFondo | null {
  const conGastos = gastosPorMes.filter((g) => g > 0);
  if (!conGastos.length) return null;
  const promedio = Math.round(conGastos.reduce((s, g) => s + c(g), 0) / conGastos.length);
  return { gastoMensual: promedio / 100, minimo: (promedio * 3) / 100, ideal: (promedio * 6) / 100 };
}

export type Proyeccion = {
  ritmoMensual: number;
  alCierreDelAnio: number;
  /** null si la meta no tiene fecha; true si al ritmo actual llega a tiempo. */
  llegaATiempo: boolean | null;
  /** Mes estimado en que se completa (AAAA-MM) o null si el ritmo es 0. */
  mesEstimado: string | null;
};

const mesesEntre = (desde: string, hasta: string) => {
  const [a1, m1] = desde.split("-").map(Number) as [number, number];
  const [a2, m2] = hasta.split("-").map(Number) as [number, number];
  return (a2 - a1) * 12 + (m2 - m1);
};

const sumarMeses = (fecha: string, n: number) => {
  const [a, m] = fecha.split("-").map(Number) as [number, number];
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
};

/**
 * Proyecta una meta con el ritmo de aporte de los últimos meses.
 * @param aportesUltimosMeses aportes de cada uno de los últimos meses completos (puede incluir ceros).
 */
export function proyectarMeta(opciones: {
  ahorrado: number;
  objetivo: number;
  aportesUltimosMeses: number[];
  hoy: string;
  fechaObjetivo: string | null;
}): Proyeccion {
  const { ahorrado, objetivo, aportesUltimosMeses, hoy, fechaObjetivo } = opciones;
  const meses = aportesUltimosMeses.length || 1;
  const ritmo = Math.round(aportesUltimosMeses.reduce((s, a) => s + c(a), 0) / meses);
  const anio = hoy.slice(0, 4);
  const restantesAnio = mesesEntre(hoy, `${anio}-12-31`);
  const falta = Math.max(0, c(objetivo) - c(ahorrado));

  let mesEstimado: string | null = null;
  if (falta === 0) mesEstimado = hoy.slice(0, 7);
  else if (ritmo > 0) mesEstimado = sumarMeses(hoy, Math.ceil(falta / ritmo));

  let llegaATiempo: boolean | null = null;
  if (fechaObjetivo) llegaATiempo = mesEstimado !== null && mesEstimado <= fechaObjetivo.slice(0, 7);

  return {
    ritmoMensual: ritmo / 100,
    alCierreDelAnio: (c(ahorrado) + ritmo * restantesAnio) / 100,
    llegaATiempo,
    mesEstimado,
  };
}

/**
 * Cierre de mes: lo que quedó sin asignar en el periodo anterior y se puede mandar a una meta.
 * Solo se ofrece si ese periodo tuvo movimientos (si no usabas la app, no hay nada que cerrar).
 */
export function sobranteDelPeriodo(sinAsignar: number, cantidadMovimientos: number): number {
  return cantidadMovimientos > 0 && sinAsignar > 0 ? sinAsignar : 0;
}
