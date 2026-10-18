"use client";

import { useActionState } from "react";
import { restaurarRespaldo, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";

/** Sube un respaldo descargado antes. Agrega lo que falta: restaurarlo dos veces no duplica nada. */
export function RestaurarRespaldo() {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(restaurarRespaldo, {});

  return (
    <details className="rounded-[16px] bg-fondo">
      <summary className="cursor-pointer list-none py-3 text-center text-[17px] font-semibold text-azul">
        Restaurar desde un respaldo
      </summary>
      <form action={accion} className="flex flex-col gap-3 px-3 pb-3">
        <p className="text-[13px] leading-snug text-texto-2">
          Elige el archivo <b>savewise-respaldo-….json</b>. Se agrega lo que falte (movimientos, metas, deudas, categorías y lo que te deben) sin
          duplicar lo que ya tienes, y se recuperan tu sueldo y tu día de pago.
        </p>
        <input
          type="file"
          name="archivo"
          accept="application/json,.json"
          required
          className="text-[15px] file:mr-3 file:rounded-full file:border-0 file:bg-tarjeta file:px-4 file:py-2 file:font-semibold file:text-azul"
        />
        {estado.ok && <p className="text-[15px] font-semibold text-verde">Respaldo restaurado.</p>}
        {estado.error && <p className={`text-[15px] ${estado.ok ? "text-texto-2" : "text-rojo"}`}>{estado.error}</p>}
        <BotonEnviar texto="Restaurar" textoEnviando="Restaurando…" />
      </form>
    </details>
  );
}
