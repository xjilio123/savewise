// Restaurar un respaldo (el JSON de /api/respaldo). Todo lo que viene del archivo se valida aquí:
// es entrada externa. El plan es puro (sin base de datos) para poder probarlo; la acción del servidor
// solo lo ejecuta, siempre con el user_id de la sesión.

import { z } from "zod";
import { COLORES_CATEGORIA } from "@/lib/colores";
import { VERSION_RESPALDO } from "@/lib/respaldo";

export const TAMANO_MAXIMO = 4 * 1024 * 1024; // 4 MB: el límite de las acciones del servidor

const MONEDA = z.string().regex(/^[A-Z]{3}$/);
const MONTO = z.coerce.number().positive().max(999_999_999);
const FECHA = z.iso.date();
const TIPOS = ["INGRESO", "GASTO", "AHORRO", "PARA_MI", "OCIO"] as const;
const COLORES = [...COLORES_CATEGORIA, "gris"] as const;

const esquemaRespaldoArchivo = z.object({
  app: z.literal("SaveWise"),
  version: z.literal(VERSION_RESPALDO),
  perfil: z.object({
    sueldo_mensual: z.coerce.number().min(0).max(999_999_999),
    moneda_base: MONEDA,
    dia_pago: z.coerce.number().int().min(1).max(31),
  }),
  categorias: z
    .array(
      z.object({
        id: z.uuid(),
        nombre: z.string().trim().min(1).max(40),
        color: z.enum(COLORES),
        tope: MONTO.nullable().optional(),
      }),
    )
    .max(50),
  metas: z
    .array(
      z.object({
        id: z.uuid(),
        nombre: z.string().trim().min(1).max(60),
        objetivo: MONTO,
        moneda: MONEDA,
        fecha_objetivo: FECHA.nullable(),
        archivada: z.boolean(),
        reto_base: z.coerce.number().positive().max(1000).nullable().optional(),
      }),
    )
    .max(200),
  deudas: z
    .array(
      z.object({
        id: z.uuid(),
        nombre: z.string().trim().min(1).max(60),
        tipo: z.enum(["tarjeta", "prestamo", "otro"]),
        monto_total: MONTO,
        cuota_mensual: MONTO.nullable(),
        dia_pago: z.coerce.number().int().min(1).max(31).nullable(),
        tea: z.coerce.number().min(0).max(1000).nullable(),
        moneda: MONEDA,
        cerrada: z.boolean(),
      }),
    )
    .max(100),
  movimientos: z
    .array(
      z.object({
        id: z.uuid(),
        fecha: FECHA,
        tipo: z.enum(TIPOS),
        categoria_id: z.uuid().nullable(),
        meta_id: z.uuid().nullable(),
        deuda_id: z.uuid().nullable().optional(),
        concepto: z.string().trim().min(1).max(80),
        monto: MONTO,
        moneda: MONEDA,
        tipo_cambio: z.coerce.number().positive(),
        recurrente: z.boolean(),
        nota: z.string().max(280).optional(),
      }),
    )
    .max(50_000),
});

export type RespaldoArchivo = z.infer<typeof esquemaRespaldoArchivo>;

/** Lee y valida el texto del archivo. Nunca lanza: devuelve el respaldo o un mensaje para el usuario. */
export function leerRespaldo(texto: string): { respaldo: RespaldoArchivo } | { error: string } {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return { error: "El archivo no es un respaldo válido (no es JSON)." };
  }
  const r = esquemaRespaldoArchivo.safeParse(crudo);
  if (!r.success) return { error: "El archivo no es un respaldo de SaveWise o está dañado." };
  return { respaldo: r.data };
}

type Existentes = {
  categorias: { id: string; nombre: string; color: string }[];
  metas: { id: string; nombre: string }[];
  deudas: { id: string; nombre: string }[];
};

const clave = (nombre: string) => nombre.trim().toLowerCase();

/**
 * Decide qué insertar sin duplicar: una categoría, meta o deuda que ya existe (mismo id o mismo
 * nombre) se reutiliza; los movimientos llevan su id original, así que restaurar dos veces no duplica.
 */
export function planRestauracion(r: RespaldoArchivo, existentes: Existentes) {
  // ---- Categorías: cada una con un color libre (nunca gris, nunca repetido)
  const mapaCategorias = new Map<string, string | null>();
  const usados = new Set(existentes.categorias.map((c) => c.color));
  const categorias: { id: string; nombre: string; color: (typeof COLORES_CATEGORIA)[number]; tope: number | null }[] = [];
  let categoriasSinColor = 0;
  for (const c of r.categorias) {
    const igual = existentes.categorias.find((e) => e.id === c.id || clave(e.nombre) === clave(c.nombre));
    if (igual) {
      mapaCategorias.set(c.id, igual.id);
      continue;
    }
    const color =
      c.color !== "gris" && !usados.has(c.color) ? c.color : COLORES_CATEGORIA.find((libre) => !usados.has(libre));
    if (!color) {
      mapaCategorias.set(c.id, null); // sin colores libres: sus movimientos quedan "Sin categoría"
      categoriasSinColor += 1;
      continue;
    }
    usados.add(color);
    categorias.push({ id: c.id, nombre: c.nombre, color, tope: c.tope ?? null });
    mapaCategorias.set(c.id, c.id);
  }

  // ---- Metas y deudas: reutilizar por id o por nombre
  const mapaMetas = new Map<string, string>();
  const metas = [];
  for (const m of r.metas) {
    const igual = existentes.metas.find((e) => e.id === m.id || clave(e.nombre) === clave(m.nombre));
    if (igual) mapaMetas.set(m.id, igual.id);
    else {
      metas.push({ ...m, reto_base: m.reto_base ?? null });
      mapaMetas.set(m.id, m.id);
    }
  }
  const mapaDeudas = new Map<string, string>();
  const deudas = [];
  for (const d of r.deudas) {
    const igual = existentes.deudas.find((e) => e.id === d.id || clave(e.nombre) === clave(d.nombre));
    if (igual) mapaDeudas.set(d.id, igual.id);
    else {
      deudas.push(d);
      mapaDeudas.set(d.id, d.id);
    }
  }

  // ---- Movimientos: referencias traducidas; un ahorro sin meta no se puede guardar (regla de la base)
  const movimientos = [];
  let omitidos = 0;
  for (const m of r.movimientos) {
    const meta_id = m.meta_id ? (mapaMetas.get(m.meta_id) ?? null) : null;
    if (m.tipo === "AHORRO" && !meta_id) {
      omitidos += 1;
      continue;
    }
    movimientos.push({
      id: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      categoria_id: m.categoria_id ? (mapaCategorias.get(m.categoria_id) ?? null) : null,
      meta_id: m.tipo === "AHORRO" ? meta_id : null,
      deuda_id: m.deuda_id ? (mapaDeudas.get(m.deuda_id) ?? null) : null,
      concepto: m.concepto,
      monto: m.monto,
      moneda: m.moneda,
      tipo_cambio: m.tipo_cambio,
      recurrente: m.recurrente,
      nota: m.nota ?? "",
    });
  }

  return { categorias, metas, deudas, movimientos, omitidos, categoriasSinColor };
}
