"use client";

import { useActionState } from "react";
import { borrarMisDatos, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";

export function BorrarDatos() {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(borrarMisDatos, {});

  return (
    <details className="rounded-[22px] bg-tarjeta">
      <summary className="cursor-pointer list-none px-5 py-4 text-center text-[17px] font-semibold text-rojo">
        Borrar todos mis datos
      </summary>
      <form action={accion} className="flex flex-col gap-3 px-4 pb-4">
        <p className="text-[15px] leading-snug text-texto-2">
          Borra todos tus movimientos y metas. Tu cuenta, tu sueldo y tus categorías se mantienen. No se puede deshacer.
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold">
            Escribe <span className="text-rojo">BORRAR</span> para confirmar
          </span>
          <input
            name="confirmacion"
            autoComplete="off"
            autoCapitalize="characters"
            required
            className="rounded-2xl bg-fondo px-4 py-3 text-[17px] outline-none"
          />
        </label>
        <MensajeError texto={estado.errores?.confirmacion ?? estado.error} />
        <BotonEnviar texto="Borrar todo" textoEnviando="Borrando…" clase="bg-rojo text-fondo" />
      </form>
    </details>
  );
}
