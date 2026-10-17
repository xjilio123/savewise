import { z } from "zod";
import type { TipoMovimiento } from "@/lib/supabase/tipos";

export const TAMANO_PAGINA = 20;
export const TIPOS: readonly TipoMovimiento[] = ["GASTO", "OCIO", "AHORRO", "PARA_MI", "INGRESO"];

export type Filtros = {
  desde: string;
  hasta: string;
  tipo?: TipoMovimiento;
  categoria?: string;
  q?: string;
  pagina: number;
};

type Parametros = Record<string, string | string[] | undefined>;

// Cada parámetro de la URL se valida por separado: uno inválido se ignora, nunca rompe la consulta.
const esquema = z.object({
  desde: z.iso.date().optional().catch(undefined),
  hasta: z.iso.date().optional().catch(undefined),
  tipo: z.enum(["GASTO", "OCIO", "AHORRO", "PARA_MI", "INGRESO"]).optional().catch(undefined),
  categoria: z.uuid().optional().catch(undefined),
  q: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v || undefined)
    .optional()
    .catch(undefined),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
});

const primero = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);

export function leerFiltros(parametros: Parametros, porDefecto: { desde: string; hasta: string }): Filtros {
  const f = esquema.parse({
    desde: primero(parametros.desde),
    hasta: primero(parametros.hasta),
    tipo: primero(parametros.tipo),
    categoria: primero(parametros.categoria),
    q: primero(parametros.q),
    pagina: primero(parametros.pagina),
  });

  let desde = f.desde ?? porDefecto.desde;
  let hasta = f.hasta ?? porDefecto.hasta;
  if (desde > hasta) [desde, hasta] = [hasta, desde];

  return { desde, hasta, tipo: f.tipo, categoria: f.categoria, q: f.q, pagina: f.pagina };
}

/** URL del Historial con los filtros dados (omite los vacíos y la página 1). */
export function urlHistorial(f: Partial<Filtros>): string {
  const p = new URLSearchParams();
  if (f.desde) p.set("desde", f.desde);
  if (f.hasta) p.set("hasta", f.hasta);
  if (f.tipo) p.set("tipo", f.tipo);
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.q) p.set("q", f.q);
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  const consulta = p.toString();
  return consulta ? `/historial?${consulta}` : "/historial";
}

/** Escapa los comodines de LIKE para que el texto se busque literal. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function totalPaginas(cantidad: number): number {
  return Math.max(1, Math.ceil(cantidad / TAMANO_PAGINA));
}

/** Hasta 5 números de página alrededor de la actual. */
export function paginasVisibles(actual: number, total: number, ventana = 5): number[] {
  const inicio = Math.max(1, Math.min(actual - Math.floor(ventana / 2), total - ventana + 1));
  const fin = Math.min(total, inicio + ventana - 1);
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}
