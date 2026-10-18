"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { saldoDeuda } from "@/lib/deudas";
import { calcularResumen } from "@/lib/dinero";
import { etiquetaRango, hoyLima, periodoFinanciero, sumarDias } from "@/lib/fechas";
import { pedirResumen, type ResultadoIA } from "@/lib/ia";
import { finDelReto, objetivoReto } from "@/lib/ideas";
import { enviarAviso } from "@/lib/notificaciones";
import { sobranteDelPeriodo, sugerirFondoEmergencia } from "@/lib/planificacion";
import { esquemaSuscripcion, generarToken, huellaToken } from "@/lib/pwa";
import { requerirUsuario } from "@/lib/supabase/servidor";
import { COOKIE_TEMA, TEMAS } from "@/lib/tema";
import { obtenerTipoCambio } from "@/lib/tipoCambio";
import {
  erroresPorCampo,
  esquemaDeuda,
  esquemaId,
  esquemaMeta,
  esquemaMovimiento,
  esquemaPerfil,
  esquemaTope,
  texto,
  type ErroresCampo,
} from "@/lib/validacion";

export type EstadoFormulario = { errores?: ErroresCampo; error?: string; ok?: boolean };

const ERROR_GENERICO = "No se pudo guardar. Intenta de nuevo.";
const ERROR_CAMBIO = "No se pudo obtener el tipo de cambio. Revisa tu conexión e intenta de nuevo.";

// Patrón de cada acción: 1) verificar la sesión con el servidor, 2) validar con Zod,
// 3) el user_id sale de la sesión, nunca del formulario. Los errores de la base no se muestran tal cual.

function leerMovimiento(campo: (nombre: string) => string) {
  return esquemaMovimiento.safeParse({
    tipo: campo("tipo"),
    monto: campo("monto"),
    concepto: campo("concepto"),
    fecha: campo("fecha"),
    moneda: campo("moneda") || undefined,
    categoria_id: campo("categoria_id"),
    meta_id: campo("meta_id"),
    deuda_id: campo("deuda_id"),
    nota: campo("nota"),
    recurrente: campo("recurrente") === "on",
  });
}

const destinoPorTipo = (tipo: string) =>
  ({ OCIO: "/para-mi", PARA_MI: "/para-mi", AHORRO: "/ahorros" })[tipo] ?? "/";

type Sesion = Awaited<ReturnType<typeof requerirUsuario>>;

/** Valida e inserta un movimiento. Devuelve el estado de error o null si se guardó. */
async function insertarMovimiento(
  { supabase, usuario }: Sesion,
  campo: (nombre: string) => string,
  id?: string,
): Promise<{ estado: EstadoFormulario; tipo?: string } | null> {
  const datos = leerMovimiento(campo);
  if (!datos.success) return { estado: { errores: erroresPorCampo(datos.error) } };

  const { data: perfil } = await supabase.from("perfiles").select("moneda_base").single();
  const base = perfil?.moneda_base ?? "PEN";
  const moneda = datos.data.moneda ?? base;

  // El tipo de cambio se calcula en el servidor y queda congelado en la fila.
  let tipoCambio: number;
  try {
    tipoCambio = await obtenerTipoCambio(moneda, base);
  } catch {
    return { estado: { error: ERROR_CAMBIO } };
  }

  const { error } = await supabase.from("movimientos").insert({
    ...(id ? { id } : {}),
    ...datos.data,
    meta_id: datos.data.tipo === "AHORRO" ? datos.data.meta_id : null,
    deuda_id: datos.data.tipo === "GASTO" ? (datos.data.deuda_id ?? null) : null,
    moneda,
    tipo_cambio: tipoCambio,
    user_id: usuario.id,
  });
  // Con un id del cliente, "ya existe" significa que una sincronización anterior sí llegó.
  if (error && !(id && error.code === "23505")) return { estado: { error: ERROR_GENERICO } };
  return null;
}

export async function guardarMovimiento(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirUsuario();
  const fallo = await insertarMovimiento(sesion, (c) => texto(formData, c));
  if (fallo) return fallo.estado;

  revalidatePath("/", "layout");
  redirect(destinoPorTipo(texto(formData, "tipo")));
}

/**
 * Envía un movimiento que se guardó en el iPhone sin conexión. El id lo genera el teléfono
 * (crypto.randomUUID) para que reintentar nunca duplique el registro.
 */
export async function sincronizarMovimiento(id: string, datos: Record<string, string>): Promise<EstadoFormulario> {
  const sesion = await requerirUsuario();
  if (!esquemaId.safeParse(id).success) return { error: "Registro inválido" };
  const fallo = await insertarMovimiento(sesion, (c) => (typeof datos[c] === "string" ? datos[c] : ""), id);
  if (fallo) return fallo.estado;
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function actualizarMovimiento(
  id: string,
  _: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const { supabase } = await requerirUsuario();
  if (!esquemaId.safeParse(id).success) return { error: "Movimiento no encontrado" };
  const datos = leerMovimiento((c) => texto(formData, c));
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
      deuda_id: datos.data.tipo === "GASTO" ? (datos.data.deuda_id ?? null) : null,
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

/** Pantallas a las que se puede volver tras eliminar (lista cerrada: evita redirecciones abiertas). */
const VOLVER_TRAS_ELIMINAR = ["/historial", "/ahorros", "/dashboard"] as const;

/**
 * Deja de repetir una serie (suscripción cancelada, cambio de servicio…). Se marca el último
 * movimiento como "no se repite": el cron ya no lo copia ni avisa, y el historial queda intacto.
 */
export async function dejarDeRepetir(id: string): Promise<void> {
  const { supabase } = await requerirUsuario();
  if (esquemaId.safeParse(id).success) {
    await supabase.from("movimientos").update({ recurrente: false }).eq("id", id);
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function eliminarMovimiento(id: string, volver: string = "/historial"): Promise<void> {
  const { supabase } = await requerirUsuario();
  const destino = (VOLVER_TRAS_ELIMINAR as readonly string[]).includes(volver) ? volver : "/historial";
  if (!esquemaId.safeParse(id).success) redirect(destino);
  await supabase.from("movimientos").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect(destino);
}

export async function borrarMisDatos(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();
  if (texto(formData, "confirmacion").trim().toUpperCase() !== "BORRAR") {
    return { errores: { confirmacion: "Escribe BORRAR para confirmar" } };
  }

  // Primero los movimientos (referencian metas y deudas), luego el resto. RLS limita todo a tus filas.
  const movimientos = await supabase.from("movimientos").delete().eq("user_id", usuario.id);
  const [metas, deudas] = await Promise.all([
    supabase.from("metas").delete().eq("user_id", usuario.id),
    supabase.from("deudas").delete().eq("user_id", usuario.id),
  ]);
  if (movimientos.error || metas.error || deudas.error) return { error: "No se pudo borrar todo. Intenta de nuevo." };

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

  const datos = leerMeta(formData);
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

function leerMeta(formData: FormData) {
  return esquemaMeta.safeParse({
    nombre: texto(formData, "nombre"),
    objetivo: texto(formData, "objetivo"),
    fecha_objetivo: texto(formData, "fecha_objetivo"),
  });
}

export async function actualizarMeta(id: string, _: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase } = await requerirUsuario();
  if (!esquemaId.safeParse(id).success) return { error: "Meta no encontrada" };
  const datos = leerMeta(formData);
  if (!datos.success) return { errores: erroresPorCampo(datos.error) };

  const { data, error } = await supabase.from("metas").update(datos.data).eq("id", id).select("id");
  if (error) {
    return error.code === "23505" ? { errores: { nombre: "Ya tienes una meta con ese nombre" } } : { error: ERROR_GENERICO };
  }
  if (!data?.length) return { error: "Meta no encontrada" };
  revalidatePath("/", "layout");
  redirect("/ahorros");
}

/** Archiva una meta (deja de mostrarse y de sumar en el total) o la reactiva. Sus aportes no se tocan. */
export async function alternarMetaArchivada(id: string, archivada: boolean): Promise<void> {
  const { supabase } = await requerirUsuario();
  if (esquemaId.safeParse(id).success) {
    await supabase.from("metas").update({ archivada }).eq("id", id);
  }
  revalidatePath("/", "layout");
  redirect("/ahorros");
}

/**
 * Elimina una meta. Todo ahorro debe tener meta (regla de la base), así que sus aportes se mueven
 * a otra meta tuya o se eliminan también, según lo que elijas en la confirmación.
 */
export async function eliminarMeta(id: string, formData: FormData): Promise<void> {
  const { supabase } = await requerirUsuario();
  if (!esquemaId.safeParse(id).success) redirect("/ahorros");
  const destino = texto(formData, "destino");

  if (destino === "eliminar") {
    await supabase.from("movimientos").delete().eq("meta_id", id).eq("tipo", "AHORRO");
  } else if (destino) {
    if (!esquemaId.safeParse(destino).success || destino === id) redirect("/ahorros");
    // La llave compuesta (meta_id, user_id) impide mover aportes a una meta de otra persona.
    await supabase.from("movimientos").update({ meta_id: destino }).eq("meta_id", id);
  }
  // Si quedan aportes (no se eligió destino), la base rechaza el borrado: no se pierde nada.
  await supabase.from("metas").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/ahorros");
}

// ---------- Planificación (Fase 5) ----------

/** Crea la meta "Fondo de emergencia" con 6 meses de gastos. El monto se calcula aquí, no viene del teléfono. */
export async function crearMetaEmergencia(): Promise<void> {
  const { supabase, usuario } = await requerirUsuario();
  const hoy = hoyLima();
  const [a, m] = hoy.split("-").map(Number) as [number, number];
  const desde = new Date(Date.UTC(a, m - 3, 1)).toISOString().slice(0, 10);

  const [{ data: totales }, { data: perfil }] = await Promise.all([
    supabase.from("resumen_mensual").select("mes, total").eq("tipo", "GASTO").gte("mes", desde),
    supabase.from("perfiles").select("moneda_base").single(),
  ]);
  const meses = [0, 1, 2].map((i) => new Date(Date.UTC(a, m - 3 + i, 1)).toISOString().slice(0, 10));
  const sugerencia = sugerirFondoEmergencia(
    meses.map((mes) => (totales ?? []).filter((t) => t.mes === mes).reduce((s, t) => s + Number(t.total ?? 0), 0)),
  );
  if (!sugerencia) redirect("/ahorros");

  await supabase.from("metas").insert({
    nombre: "Fondo de emergencia",
    objetivo: sugerencia.ideal,
    moneda: perfil?.moneda_base ?? "PEN",
    user_id: usuario.id,
  });
  revalidatePath("/ahorros");
  redirect("/ahorros");
}

/**
 * Cierre de mes: manda lo que quedó sin asignar en el periodo anterior a una meta.
 * El sobrante se recalcula en el servidor; el aporte se fecha en el último día de ese periodo.
 */
export async function cerrarPeriodo(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();
  const metaId = texto(formData, "meta_id");
  if (!esquemaId.safeParse(metaId).success) return { error: "Elige una meta" };

  const { data: perfil } = await supabase.from("perfiles").select("sueldo_mensual, dia_pago, moneda_base").single();
  if (!perfil) return { error: ERROR_GENERICO };
  const actual = periodoFinanciero(hoyLima(), perfil.dia_pago);
  const anterior = periodoFinanciero(sumarDias(actual.desde, -1), perfil.dia_pago);

  const { data: movimientos } = await supabase
    .from("movimientos")
    .select("tipo, monto_base")
    .gte("fecha", anterior.desde)
    .lte("fecha", anterior.hasta);
  const sobrante = sobranteDelPeriodo(
    calcularResumen(perfil.sueldo_mensual, movimientos ?? []).sinAsignar,
    movimientos?.length ?? 0,
  );
  if (sobrante <= 0) return { error: "No hay nada que cerrar en el periodo anterior." };

  const { error } = await supabase.from("movimientos").insert({
    tipo: "AHORRO",
    concepto: `Cierre ${etiquetaRango(anterior.desde, anterior.hasta)}`,
    monto: sobrante,
    moneda: perfil.moneda_base,
    tipo_cambio: 1,
    fecha: anterior.hasta,
    meta_id: metaId,
    user_id: usuario.id,
  });
  if (error) return { error: ERROR_GENERICO };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Guarda los topes de las categorías propias. Campo vacío = sin tope. */
export async function guardarTopes(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase } = await requerirUsuario();
  // Solo se aceptan las categorías que RLS devuelve (las tuyas); cualquier otro campo se ignora.
  const { data: categorias } = await supabase.from("categorias").select("id, nombre");
  for (const categoria of categorias ?? []) {
    const crudo = texto(formData, `tope_${categoria.id}`).trim().replace(",", ".");
    const tope = crudo === "" ? null : esquemaTope.safeParse(crudo);
    if (tope && !tope.success) return { error: `Tope inválido en ${categoria.nombre}` };
    const { error } = await supabase
      .from("categorias")
      .update({ tope: tope ? tope.data : null })
      .eq("id", categoria.id);
    if (error) return { error: ERROR_GENERICO };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Notificaciones push ----------

// ---------- Reto de 52 semanas ----------

/** Montos base permitidos: el objetivo y cada aporte semanal se calculan aquí, no vienen del teléfono. */
const BASES_RETO = [1, 2, 5, 10] as const;

export async function crearReto(formData: FormData): Promise<void> {
  const { supabase, usuario } = await requerirUsuario();
  const base = Number(texto(formData, "base"));
  if (!(BASES_RETO as readonly number[]).includes(base)) redirect("/ahorros");

  const hoy = hoyLima();
  const { data: perfil } = await supabase.from("perfiles").select("moneda_base").single();
  await supabase.from("metas").insert({
    nombre: "Reto 52 semanas",
    objetivo: objetivoReto(base),
    fecha_objetivo: finDelReto(hoy),
    reto_base: base,
    moneda: perfil?.moneda_base ?? "PEN",
    user_id: usuario.id,
  });
  revalidatePath("/ahorros");
  redirect("/ahorros");
}

// ---------- Deudas y tarjetas (Fase 5c) ----------

export async function crearDeuda(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();

  const datos = esquemaDeuda.safeParse({
    nombre: texto(formData, "nombre"),
    tipo: texto(formData, "tipo"),
    monto_total: texto(formData, "monto_total"),
    cuota_mensual: texto(formData, "cuota_mensual"),
    dia_pago: texto(formData, "dia_pago"),
    tea: texto(formData, "tea"),
  });
  if (!datos.success) return { errores: erroresPorCampo(datos.error) };

  const { data: perfil } = await supabase.from("perfiles").select("moneda_base").single();
  const { error } = await supabase
    .from("deudas")
    .insert({ ...datos.data, moneda: perfil?.moneda_base ?? "PEN", user_id: usuario.id });
  if (error) {
    return error.code === "23505" ? { errores: { nombre: "Ya tienes una deuda con ese nombre" } } : { error: ERROR_GENERICO };
  }

  revalidatePath("/deudas");
  redirect("/deudas");
}

export async function actualizarDeuda(id: string, _: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase } = await requerirUsuario();
  if (!esquemaId.safeParse(id).success) return { error: "Deuda no encontrada" };
  const datos = esquemaDeuda.safeParse({
    nombre: texto(formData, "nombre"),
    tipo: texto(formData, "tipo"),
    monto_total: texto(formData, "monto_total"),
    cuota_mensual: texto(formData, "cuota_mensual"),
    dia_pago: texto(formData, "dia_pago"),
    tea: texto(formData, "tea"),
  });
  if (!datos.success) return { errores: erroresPorCampo(datos.error) };

  const { data, error } = await supabase.from("deudas").update(datos.data).eq("id", id).select("id");
  if (error) {
    return error.code === "23505" ? { errores: { nombre: "Ya tienes una deuda con ese nombre" } } : { error: ERROR_GENERICO };
  }
  if (!data?.length) return { error: "Deuda no encontrada" };
  revalidatePath("/", "layout");
  redirect("/deudas");
}

/** Marca una deuda como pagada (o la reabre). Sus pagos recurrentes dejan de generarse. */
export async function alternarDeudaCerrada(id: string, cerrada: boolean): Promise<void> {
  const { supabase } = await requerirUsuario();
  if (esquemaId.safeParse(id).success) {
    await supabase.from("deudas").update({ cerrada }).eq("id", id);
  }
  revalidatePath("/", "layout");
  redirect("/deudas");
}

/** Elimina la deuda. Sus pagos se conservan como gastos normales (deuda_id pasa a null). */
export async function eliminarDeuda(id: string): Promise<void> {
  const { supabase } = await requerirUsuario();
  if (esquemaId.safeParse(id).success) {
    await supabase.from("deudas").delete().eq("id", id);
  }
  revalidatePath("/", "layout");
  redirect("/deudas");
}

// ---------- Resumen con IA (Fase 5d) ----------

/**
 * Pide a Gemini un resumen del periodo. Los totales se calculan aquí con la sesión del usuario:
 * el teléfono no envía datos, y a Google solo llegan cifras agregadas (ver src/lib/ia.ts).
 */
export async function pedirResumenIA(): Promise<ResultadoIA> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return { error: "El resumen con IA no está activado." };

  const { supabase } = await requerirUsuario();
  const repo = crearRepositorio(supabase);
  const perfil = await repo.perfil();
  const hoy = hoyLima();
  const periodo = periodoFinanciero(hoy, perfil.dia_pago);
  const anterior = periodoFinanciero(sumarDias(periodo.desde, -1), perfil.dia_pago);

  const [movimientos, previos, porCategoria, categorias, deudas] = await Promise.all([
    repo.movimientosEntre(periodo.desde, periodo.hasta),
    repo.movimientosEntre(anterior.desde, anterior.hasta),
    repo.gastosPorCategoria(periodo.desde, periodo.hasta),
    repo.categorias(),
    repo.deudas(),
  ]);
  if (movimientos.length === 0) return { error: "Registra algunos movimientos para tener un resumen." };

  const topes = new Map(categorias.map((c) => [c.id, c.tope]));
  const abiertas = deudas.filter((d) => !d.cerrada);
  const previo = calcularResumen(perfil.sueldo_mensual, previos);

  return pedirResumen(
    {
      periodo: etiquetaRango(periodo.desde, periodo.hasta),
      diasTranscurridos: periodo.diasDelMes - periodo.diasRestantes + 1,
      diasDelPeriodo: periodo.diasDelMes,
      moneda: perfil.moneda_base,
      sueldo: perfil.sueldo_mensual,
      actual: calcularResumen(perfil.sueldo_mensual, movimientos),
      anterior: { gastos: previo.gastos, ahorros: previo.ahorros, ocio: previo.ocio },
      categorias: porCategoria.map((c) => ({ nombre: c.nombre, total: c.total, tope: c.id ? topes.get(c.id) : null })),
      deudas: {
        pendiente: abiertas.reduce((s, d) => s + saldoDeuda(d.monto_total, d.pagado), 0),
        cuotasMensuales: abiertas.reduce((s, d) => s + (d.cuota_mensual ?? 0), 0),
      },
    },
    { clave, modelo: process.env.GEMINI_MODELO },
  );
}

export async function guardarSuscripcion(suscripcion: unknown): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();
  const datos = esquemaSuscripcion.safeParse(suscripcion);
  if (!datos.success) return { error: "No se pudo activar los avisos en este dispositivo." };

  // Reemplaza la suscripción previa de este dispositivo (RLS: solo las propias).
  await supabase.from("push_suscripciones").delete().eq("endpoint", datos.data.endpoint);
  const { error } = await supabase.from("push_suscripciones").insert({
    endpoint: datos.data.endpoint,
    p256dh: datos.data.keys.p256dh,
    auth: datos.data.keys.auth,
    user_id: usuario.id,
  });
  return error ? { error: "No se pudo activar los avisos." } : { ok: true };
}

export async function quitarSuscripcion(endpoint: string): Promise<EstadoFormulario> {
  const { supabase } = await requerirUsuario();
  if (typeof endpoint !== "string" || endpoint.length > 1000) return { error: "Dispositivo inválido" };
  await supabase.from("push_suscripciones").delete().eq("endpoint", endpoint);
  return { ok: true };
}

export async function enviarAvisoPrueba(): Promise<EstadoFormulario> {
  const { supabase } = await requerirUsuario();
  const { data: suscripciones } = await supabase.from("push_suscripciones").select("endpoint, p256dh, auth");
  if (!suscripciones?.length) return { error: "Activa los avisos primero." };

  const resultados = await Promise.all(
    suscripciones.map((s) =>
      enviarAviso(s, { titulo: "SaveWise", cuerpo: "Los avisos funcionan. Te avisaremos antes de cada renovación.", url: "/ajustes" }),
    ),
  );
  return resultados.includes("ok") ? { ok: true } : { error: "No se pudo enviar el aviso de prueba." };
}

// ---------- Atajo de Siri ----------

/** Crea (o reemplaza) el token del Atajo. Se devuelve una sola vez; en la base solo queda su huella. */
export async function crearTokenAtajo(): Promise<{ token?: string; error?: string }> {
  const { supabase, usuario } = await requerirUsuario();
  const token = generarToken();
  await supabase.from("tokens_atajo").delete().eq("user_id", usuario.id);
  const { error } = await supabase.from("tokens_atajo").insert({ hash_token: huellaToken(token), user_id: usuario.id });
  if (error) return { error: "No se pudo crear el token." };
  revalidatePath("/ajustes");
  return { token };
}

export async function revocarTokenAtajo(): Promise<EstadoFormulario> {
  const { supabase, usuario } = await requerirUsuario();
  await supabase.from("tokens_atajo").delete().eq("user_id", usuario.id);
  revalidatePath("/ajustes");
  return { ok: true };
}

/** Guarda el tema elegido. La cookie no es un secreto, pero va HttpOnly: solo la lee el servidor. */
export async function guardarTema(formData: FormData): Promise<void> {
  await requerirUsuario();
  const tema = texto(formData, "tema");
  if (!(TEMAS as readonly string[]).includes(tema)) return;
  (await cookies()).set(COOKIE_TEMA, tema, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

export async function cerrarSesion() {
  const { supabase } = await requerirUsuario();
  await supabase.auth.signOut();
  redirect("/login");
}
