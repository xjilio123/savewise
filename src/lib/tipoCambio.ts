import { z } from "zod";

// Fuente: ExchangeRate-API (plan abierto, sin clave). Sus términos piden citarla.
export const FUENTE_TIPO_CAMBIO = { nombre: "ExchangeRate-API", url: "https://www.exchangerate-api.com" };

const CODIGO = /^[A-Z]{3}$/;

const esquemaRespuesta = z.object({
  result: z.literal("success"),
  base_code: z.string().regex(CODIGO),
  rates: z.record(z.string(), z.number().positive()),
});

/** Saca la tasa hacia `hacia` de la respuesta de la API, validando su forma. */
export function extraerTasa(respuesta: unknown, desde: string, hacia: string): number {
  const datos = esquemaRespuesta.parse(respuesta);
  if (datos.base_code !== desde) throw new Error("La respuesta no corresponde a la moneda pedida");
  const tasa = datos.rates[hacia];
  if (tasa === undefined) throw new Error("Moneda no disponible");
  return Math.round(tasa * 1e8) / 1e8;
}

/**
 * Cuántas unidades de `hacia` vale 1 unidad de `desde`. Corre en el servidor.
 * El host es fijo y los códigos se validan, así que la URL no se puede manipular (sin SSRF).
 */
export async function obtenerTipoCambio(desde: string, hacia: string): Promise<number> {
  if (!CODIGO.test(desde) || !CODIGO.test(hacia)) throw new Error("Moneda inválida");
  if (desde === hacia) return 1;

  const respuesta = await fetch(`https://open.er-api.com/v6/latest/${desde}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(5000),
  });
  if (!respuesta.ok) throw new Error("Tipo de cambio no disponible");
  return extraerTasa(await respuesta.json(), desde, hacia);
}
