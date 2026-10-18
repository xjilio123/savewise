"use client";

import { useActionState } from "react";
import { crearPrestamo, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";

const campo = "rounded-2xl bg-fondo px-4 py-3 text-[17px] outline-none";

export function FormularioPrestamo({ hoy }: { hoy: string }) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(crearPrestamo, {});
  const errores = estado.errores ?? {};

  return (
    <details className="rounded-[22px] border-2 border-dashed border-linea p-1 open:border-solid open:bg-tarjeta">
      <summary className="cursor-pointer list-none py-3 text-center text-[17px] font-semibold text-azul">+ Anotar un préstamo</summary>
      <form action={accion} className="flex flex-col gap-3 p-3">
        <input name="persona" maxLength={60} required placeholder="¿A quién? Por ejemplo Carlos" className={campo} />
        <MensajeError texto={errores.persona} />
        <input name="monto" inputMode="decimal" required placeholder="¿Cuánto?" className={`${campo} tabular-nums`} />
        <MensajeError texto={errores.monto} />
        <input name="concepto" maxLength={80} placeholder="¿Para qué? (opcional)" className={campo} />
        <label className="flex items-center justify-between rounded-2xl bg-fondo px-4 py-3 text-[17px]">
          <span>Fecha</span>
          <input type="date" name="fecha" defaultValue={hoy} max={hoy} required className="bg-transparent text-right text-texto-2 outline-none" />
        </label>
        <MensajeError texto={errores.concepto ?? errores.fecha ?? estado.error} />
        <BotonEnviar texto="Guardar préstamo" clase="bg-verde text-fondo" />
      </form>
    </details>
  );
}
