"use client";

import { useActionState } from "react";
import { guardarMovimiento, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";

/** Suma dinero a la bolsa "Para mí" del mes. Cada aporte resta de lo que queda sin asignar. */
export function FormularioBolsa({ hoy, actual }: { hoy: string; actual: number }) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(guardarMovimiento, {});

  return (
    <form action={accion} className="flex flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <p className="text-[15px] font-semibold text-texto-2">
        {actual > 0 ? "Sumar a la bolsa del mes" : "Asigna tu bolsa de este mes"}
      </p>
      <input type="hidden" name="tipo" value="PARA_MI" />
      <input type="hidden" name="concepto" value="Bolsa del mes" />
      <input type="hidden" name="fecha" value={hoy} />
      <div className="flex gap-3">
        <input
          name="monto"
          inputMode="decimal"
          required
          placeholder="Monto"
          aria-label="Monto para la bolsa"
          className="min-w-0 flex-1 rounded-2xl bg-fondo px-4 py-3 text-[17px] tabular-nums outline-none cifra-campo"
        />
        <div className="w-32">
          <BotonEnviar texto="Asignar" textoEnviando="…" clase="bg-morado text-fondo" />
        </div>
      </div>
      <MensajeError texto={estado.errores?.monto ?? estado.error} />
    </form>
  );
}
