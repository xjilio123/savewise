import { z } from "zod";
import { COLORES_CATEGORIA } from "@/lib/colores";

export const MONEDAS = ["PEN", "USD", "EUR", "MXN", "COP", "CLP", "ARS"] as const;
export const TIPOS_FORMULARIO = ["GASTO", "OCIO", "AHORRO", "INGRESO"] as const;

/**
 * Acepta coma decimal (teclados en español: "1500,50") y el formato peruano con comas de miles
 * ("1,500.00"). Si hay punto, las comas son de miles; si no, la coma es el decimal.
 */
export function normalizarMonto(valor: string): string {
  const s = valor.trim();
  return s.includes(".") ? s.replaceAll(",", "") : s.replace(",", ".");
}

/** Lo que se puede escribir en un campo de monto: solo cifras, un separador decimal y 2 decimales. */
export function limpiarMonto(valor: string): string {
  const [entero = "", ...resto] = valor.replaceAll(",", ".").replace(/[^\d.]/g, "").split(".");
  return resto.length > 0 ? `${entero.slice(0, 9)}.${resto.join("").slice(0, 2)}` : entero.slice(0, 9);
}

/** Lo que se puede escribir en el día de pago: un número del 1 al 31 (con 45 se queda en 4). */
export function limpiarDia(valor: string): string {
  const s = valor.replace(/\D/g, "").slice(0, 2);
  return Number(s) > 31 ? s.slice(0, 1) : s;
}

const monto = z.preprocess(
  (v) => (typeof v === "string" ? normalizarMonto(v) : v),
  z.coerce
    .number({ error: "Escribe un monto válido" })
    .positive({ error: "El monto debe ser mayor a 0" })
    .max(999_999_999, { error: "El monto es demasiado grande" })
    .multipleOf(0.01, { error: "Usa máximo 2 decimales" }),
);

const uuidOpcional = z
  .union([z.uuid({ error: "Opción inválida" }), z.literal("")])
  .transform((v) => (v === "" ? null : v));

const fechaOpcional = z
  .union([z.iso.date({ error: "Fecha inválida" }), z.literal("")])
  .transform((v) => (v === "" ? null : v));

export const esquemaMovimiento = z
  .object({
    tipo: z.enum(["GASTO", "OCIO", "AHORRO", "INGRESO", "PARA_MI"], { error: "Tipo inválido" }),
    monto,
    concepto: z
      .string()
      .trim()
      .min(1, { error: "Escribe un concepto" })
      .max(80, { error: "Máximo 80 caracteres" }),
    fecha: z.iso.date({ error: "Fecha inválida" }),
    moneda: z.enum(MONEDAS, { error: "Moneda no soportada" }).optional(),
    categoria_id: uuidOpcional,
    meta_id: uuidOpcional,
    deuda_id: uuidOpcional.optional(),
    nota: z.string().trim().max(280, { error: "Máximo 280 caracteres" }).optional(),
    recurrente: z.boolean(),
  })
  .refine((d) => d.tipo !== "AHORRO" || d.meta_id !== null, {
    error: "Elige la meta de este ahorro",
    path: ["meta_id"],
  });

export const esquemaPerfil = z.object({
  sueldo_mensual: monto,
  moneda_base: z.enum(MONEDAS, { error: "Moneda no soportada" }),
  dia_pago: z.coerce
    .number({ error: "Día inválido" })
    .int({ error: "Día inválido" })
    .min(1, { error: "Entre 1 y 31" })
    .max(31, { error: "Entre 1 y 31" }),
});

/** Un sueldo menor suele ser un error al escribirlo (0.40 en vez de 400): se pide confirmarlo. */
export const SUELDO_MINIMO_SIN_AVISO = 10;

/** true si hay que avisar antes de guardar. `confirmado` es el sueldo que ya se avisó y la persona volvió a enviar. */
export function pideConfirmarSueldo(sueldo: number, confirmado: string): boolean {
  return sueldo < SUELDO_MINIMO_SIN_AVISO && confirmado !== String(sueldo);
}

export const esquemaMeta = z.object({
  nombre: z.string().trim().min(1, { error: "Ponle un nombre" }).max(60, { error: "Máximo 60 caracteres" }),
  objetivo: monto,
  fecha_objetivo: fechaOpcional,
});

export const esquemaId = z.uuid({ error: "Movimiento no encontrado" });

export const esquemaTope = monto;

export const esquemaPrestamo = z.object({
  persona: z.string().trim().min(1, { error: "¿A quién le prestaste?" }).max(60, { error: "Máximo 60 caracteres" }),
  concepto: z.string().trim().max(80, { error: "Máximo 80 caracteres" }),
  monto,
  fecha: z.iso.date({ error: "Fecha inválida" }),
});

export const esquemaCategoria = z.object({
  nombre: z.string().trim().min(1, { error: "Ponle un nombre" }).max(40, { error: "Máximo 40 caracteres" }),
  color: z.enum(COLORES_CATEGORIA, { error: "Elige un color" }),
});

/** Convierte "" en null antes de validar un campo numérico opcional. */
const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), esquema.nullable());

export const esquemaDeuda = z.object({
  nombre: z.string().trim().min(1, { error: "Ponle un nombre" }).max(60, { error: "Máximo 60 caracteres" }),
  tipo: z.enum(["tarjeta", "prestamo", "otro"], { error: "Tipo inválido" }),
  monto_total: monto,
  cuota_mensual: opcional(monto),
  dia_pago: opcional(z.coerce.number().int().min(1, { error: "Entre 1 y 31" }).max(31, { error: "Entre 1 y 31" })),
  tea: opcional(z.coerce.number({ error: "TEA inválida" }).min(0).max(1000, { error: "TEA demasiado alta" })),
});

export type ErroresCampo = Record<string, string>;

/** Primer mensaje de error por campo, listo para mostrar en el formulario. */
export function erroresPorCampo(error: z.ZodError): ErroresCampo {
  const salida: ErroresCampo = {};
  for (const problema of error.issues) {
    const campo = String(problema.path[0] ?? "formulario");
    salida[campo] ??= problema.message;
  }
  return salida;
}

/** Lee un campo de texto de un FormData sin aceptar archivos. */
export function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}
