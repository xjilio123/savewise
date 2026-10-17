"use client";

import { useActionState } from "react";
import { crearMeta, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";

export function FormularioMeta() {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(crearMeta, {});
  const errores = estado.errores ?? {};

  return (
    <details className="group rounded-[22px] border-2 border-dashed border-linea p-1 open:border-solid open:bg-tarjeta">
      <summary className="cursor-pointer list-none py-3 text-center text-[17px] font-semibold text-azul">
        + Nueva meta
      </summary>
      <form action={accion} className="flex flex-col gap-3 p-3">
        <input
          name="nombre"
          maxLength={60}
          required
          placeholder="Nombre, por ejemplo Navidad"
          className="rounded-2xl bg-fondo px-4 py-3 text-[17px] outline-none"
        />
        <MensajeError texto={errores.nombre} />
        <input
          name="objetivo"
          inputMode="decimal"
          required
          placeholder="Cuánto quieres juntar"
          className="rounded-2xl bg-fondo px-4 py-3 text-[17px] outline-none"
        />
        <MensajeError texto={errores.objetivo} />
        <label className="flex items-center justify-between rounded-2xl bg-fondo px-4 py-3 text-[17px]">
          <span>Fecha límite</span>
          <input type="date" name="fecha_objetivo" className="bg-transparent text-right text-texto-2 outline-none" />
        </label>
        <MensajeError texto={errores.fecha_objetivo ?? estado.error} />
        <BotonEnviar texto="Crear meta" clase="bg-verde text-white" />
      </form>
    </details>
  );
}
