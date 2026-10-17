"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirUsuario } from "@/lib/supabase/servidor";
import { obtenerTipoCambio } from "@/lib/tipoCambio";
import {
  erroresPorCampo,
  esquemaId,
  esquemaMeta,
  esquemaMovimiento,
  esquemaPerfil,
  texto,
  type ErroresCampo,
} from "@/lib/validacion";

export type EstadoFormulario = { errores?: ErroresCampo; error?: string; ok?: boolean };

const ERROR_GENERICO = "No se pudo guardar. Intenta de nuevo.";
const ERROR_CAMBIO = "No se pudo obtener el tipo de cambio. Revisa tu conexión e intenta de nuevo.";

// Patrón de cada acción: 1) verificar la sesión con el servidor, 2) validar con Zod,
// 3) el user_id sale de la sesión, nunca del formulario. Los errores de la base no se muestran tal cual.

function leerMovimiento(formData: FormData) {
  return esquemaMovimiento.safeParse({
    tipo: texto(formData, "tipo"),
    monto: texto(formData, "monto"),
    concepto: texto(formData, "concepto"),
    fecha: texto(formData, "fecha"),
    moneda: texto(formData, "moneda") || undefined,
    categoria_id: texto(formData, "categoria_id"),
    meta_id: texto(formData, "meta_id"),
    recurrente: texto(formData, "recurrente") === "on",
  });
}

const destinoPorTipo = (tipo: string) =>
  ({ OCIO: "/para-mi", PARA_MI: "/para-mi", AHORRO: "/ahorros" })[tipo] ?? "/";

export async function guardarMovimiento(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();
  const datos = leerMovimiento(formData);
  if (!datos.success) return { errores: erroresPorCampo(datos.error) };

  const { data: perfil } = await supabase.from("perfiles").select("moneda_base").single();
  const base = perfil?.moneda_base ?? "PEN";
  const moneda = datos.data.moneda ?? base;

  // El tipo de cambio se calcula en el servidor y queda congelado en la fila.
  let tipoCambio: number;
  try {
    tipoCambio = await obtenerTipoCambio(moneda, base);
  } catch {
    return { error: ERROR_CAMBIO };
  }

  const { error } = await supabase.from("movimientos").insert({
    ...datos.data,
    meta_id: datos.data.tipo === "AHORRO" ? datos.data.meta_id : null,
    moneda,
    tipo_cambio: tipoCambio,
    user_id: usuario.id,
  });
  if (error) return { error: ERROR_GENERICO };

  revalidatePath("/", "layout");
  redirect(destinoPorTipo(datos.data.tipo));
}

export async function actualizarMovimiento(
  id: string,
  _: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const { supabase } = await requerirUsuario();
  if (!esquemaId.safeParse(id).success) return { error: "Movimiento no encontrado" };
  const datos = leerMovimiento(formData);
  if (!datos.success) return { errores: erroresPorCampo(datos.error) };

  const [{ data: actual }, { data: perfil }] = await Promise.all([
    supabase.from("movimientos").select("moneda, tipo_cambio").eq("id", id).maybeSingle(),
    supabase.from("perfiles").select("moneda_base").single(),
  ]);
  if (!actual) return { error: "Movimiento no encontrado" };

  const base = perfil?.moneda_base ?? "PEN";
  const moneda = datos.data.moneda ?? actual.moneda;
  // Si la moneda no cambia, se conserva el tipo de cambio original: el historial no se mueve.
  let tipoCambio = actual.tipo_cambio;
  if (moneda !== actual.moneda) {
    try {
      tipoCambio = await obtenerTipoCambio(moneda, base);
    } catch {
      return { error: ERROR_CAMBIO };
    }
  }

  const { data: actualizadas, error } = await supabase
    .from("movimientos")
    .update({
      ...datos.data,
      meta_id: datos.data.tipo === "AHORRO" ? datos.data.meta_id : null,
      moneda,
      tipo_cambio: tipoCambio,
    })
    .eq("id", id)
    .select("id");
  if (error) return { error: ERROR_GENERICO };
  if (!actualizadas?.length) return { error: "Movimiento no encontrado" };

  revalidatePath("/", "layout");
  redirect("/historial");
}

export async function eliminarMovimiento(id: string): Promise<void> {
  const { supabase } = await requerirUsuario();
  if (!esquemaId.safeParse(id).success) redirect("/historial");
  await supabase.from("movimientos").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/historial");
}

export async function borrarMisDatos(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();
  if (texto(formData, "confirmacion").trim().toUpperCase() !== "BORRAR") {
    return { errores: { confirmacion: "Escribe BORRAR para confirmar" } };
  }

  // Primero los movimientos (referencian metas), luego las metas. RLS limita todo a tus filas.
  const movimientos = await supabase.from("movimientos").delete().eq("user_id", usuario.id);
  const metas = await supabase.from("metas").delete().eq("user_id", usuario.id);
  if (movimientos.error || metas.error) return { error: "No se pudo borrar todo. Intenta de nuevo." };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function guardarPerfil(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();

  const datos = esquemaPerfil.safeParse({
    sueldo_mensual: texto(formData, "sueldo_mensual"),
    moneda_base: texto(formData, "moneda_base"),
    dia_pago: texto(formData, "dia_pago"),
  });
  if (!datos.success) return { errores: erroresPorCampo(datos.error) };

  const { data: perfil } = await supabase.from("perfiles").select("moneda_base").single();
  const anterior = perfil?.moneda_base ?? "PEN";

  // Cambio de moneda base: los montos guardados se convierten con el tipo de cambio de hoy.
  if (datos.data.moneda_base !== anterior) {
    let factor: number;
    try {
      factor = await obtenerTipoCambio(anterior, datos.data.moneda_base);
    } catch {
      return { error: ERROR_CAMBIO };
    }
    const { error } = await supabase.rpc("cambiar_moneda_base", { p_nueva: datos.data.moneda_base, p_factor: factor });
    if (error) return { error: ERROR_GENERICO };
  }

  const { error } = await supabase
    .from("perfiles")
    .update({
      sueldo_mensual: datos.data.sueldo_mensual,
      dia_pago: datos.data.dia_pago,
      moneda_sueldo: datos.data.moneda_base,
    })
    .eq("id", usuario.id);
  if (error) return { error: ERROR_GENERICO };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function crearMeta(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();

  const datos = esquemaMeta.safeParse({
    nombre: texto(formData, "nombre"),
    objetivo: texto(formData, "objetivo"),
    fecha_objetivo: texto(formData, "fecha_objetivo"),
  });
  if (!datos.success) return { errores: erroresPorCampo(datos.error) };

  const { data: perfil } = await supabase.from("perfiles").select("moneda_base").single();
  const { error } = await supabase
    .from("metas")
    .insert({ ...datos.data, moneda: perfil?.moneda_base ?? "PEN", user_id: usuario.id });
  if (error) {
    return error.code === "23505" ? { errores: { nombre: "Ya tienes una meta con ese nombre" } } : { error: ERROR_GENERICO };
  }

  revalidatePath("/ahorros");
  redirect("/ahorros");
}

export async function cerrarSesion() {
  const { supabase } = await requerirUsuario();
  await supabase.auth.signOut();
  redirect("/login");
}
