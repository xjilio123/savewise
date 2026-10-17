import { z } from "zod";

export const MONEDAS = ["PEN", "USD", "EUR", "MXN", "COP", "CLP", "ARS"] as const;
export const TIPOS_FORMULARIO = ["GASTO", "OCIO", "AHORRO", "INGRESO"] as const;

const monto = z.coerce
  .number({ error: "Escribe un monto válido" })
  .positive({ error: "El monto debe ser mayor a 0" })
  .max(999_999_999, { error: "El monto es demasiado grande" })
  .multipleOf(0.01, { error: "Usa máximo 2 decimales" });

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

export const esquemaMeta = z.object({
  nombre: z.string().trim().min(1, { error: "Ponle un nombre" }).max(60, { error: "Máximo 60 caracteres" }),
  objetivo: monto,
  fecha_objetivo: fechaOpcional,
});

export const esquemaId = z.uuid({ error: "Movimiento no encontrado" });

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
