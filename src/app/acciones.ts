"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirUsuario } from "@/lib/supabase/servidor";
import {
  erroresPorCampo,
  esquemaMeta,
  esquemaMovimiento,
  esquemaPerfil,
  texto,
  type ErroresCampo,
} from "@/lib/validacion";

export type EstadoFormulario = { errores?: ErroresCampo; error?: string };

const ERROR_GENERICO = "No se pudo guardar. Intenta de nuevo.";

// Patrón de cada acción: 1) verificar la sesión con el servidor, 2) validar con Zod,
// 3) el user_id sale de la sesión, nunca del formulario. Los errores de la base no se muestran tal cual.

export async function guardarMovimiento(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();

  const datos = esquemaMovimiento.safeParse({
    tipo: texto(formData, "tipo"),
    monto: texto(formData, "monto"),
    concepto: texto(formData, "concepto"),
    fecha: texto(formData, "fecha"),
    categoria_id: texto(formData, "categoria_id"),
    meta_id: texto(formData, "meta_id"),
    recurrente: texto(formData, "recurrente") === "on",
  });
  if (!datos.success) return { errores: erroresPorCampo(datos.error) };

  const { data: perfil } = await supabase.from("perfiles").select("moneda_base").single();
  const { error } = await supabase.from("movimientos").insert({
    ...datos.data,
    meta_id: datos.data.tipo === "AHORRO" ? datos.data.meta_id : null,
    moneda: perfil?.moneda_base ?? "PEN",
    tipo_cambio: 1,
    user_id: usuario.id,
  });
  if (error) return { error: ERROR_GENERICO };

  revalidatePath("/", "layout");
  const destinos: Record<string, string> = { OCIO: "/para-mi", PARA_MI: "/para-mi", AHORRO: "/ahorros" };
  redirect(destinos[datos.data.tipo] ?? "/");
}

export async function guardarPerfil(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();

  const datos = esquemaPerfil.safeParse({
    sueldo_mensual: texto(formData, "sueldo_mensual"),
    moneda_base: texto(formData, "moneda_base"),
    dia_pago: texto(formData, "dia_pago"),
  });
  if (!datos.success) return { errores: erroresPorCampo(datos.error) };

  const { error } = await supabase
    .from("perfiles")
    .update({ ...datos.data, moneda_sueldo: datos.data.moneda_base })
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
