// Cálculos de deudas y tarjetas (Fase 5c).

export type PlanDeuda = {
  /** Meses que faltan para terminar de pagar; null si no hay cuota definida. */
  meses: number | null;
  /** true si la cuota no alcanza ni para los intereses: la deuda nunca baja. */
  sinFin: boolean;
};

/** Tasa mensual equivalente a una TEA (tasa efectiva anual, como la informan los bancos en Perú). */
export function tasaMensual(tea: number): number {
  return Math.pow(1 + tea / 100, 1 / 12) - 1;
}

/**
 * Meses para pagar un saldo con una cuota fija. Con TEA usa la fórmula de amortización:
 * n = -ln(1 - r·S/C) / ln(1 + r).
 */
export function planDeuda(saldo: number, cuota: number | null, tea: number | null): PlanDeuda {
  if (saldo <= 0) return { meses: 0, sinFin: false };
  if (!cuota || cuota <= 0) return { meses: null, sinFin: false };

  const r = tea ? tasaMensual(tea) : 0;
  if (r === 0) return { meses: Math.ceil(saldo / cuota - 1e-9), sinFin: false };
  if (cuota <= saldo * r) return { meses: null, sinFin: true };

  const n = -Math.log(1 - (r * saldo) / cuota) / Math.log(1 + r);
  return { meses: Math.ceil(n - 1e-9), sinFin: false };
}

/** Saldo aproximado: lo prestado menos lo pagado (no descuenta intereses). */
export function saldoDeuda(total: number, pagado: number): number {
  return Math.max(0, Math.round((total - pagado) * 100) / 100);
}
