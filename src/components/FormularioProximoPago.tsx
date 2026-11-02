"use client";

import { useActionState } from "react";
import { editarProximoPago, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";
import { limpiarMonto } from "@/lib/validacion";

/** Precio y fecha del próximo cobro de algo que se repite. Lo ya registrado no cambia. */
export function FormularioProximoPago({
  id,
  monto,
  fecha,
  moneda,
  despuesDe,
}: {
  id: string;
  monto: number;
  fecha: string;
  moneda: string;
  /** Fecha del último pago: el próximo tiene que ser después. */
  despuesDe: string;
}) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(editarProximoPago.bind(null, id), {});

  return (
    <form action={accion} className="flex flex-col gap-2 rounded-[14px] bg-fondo p-3">
      <p className="px-1 text-[13px] font-semibold text-texto-2">Editar el próximo pago</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="px-1 text-[13px] text-texto-2">Monto ({moneda})</span>
          <input
            name="monto"
            inputMode="decimal"
            autoComplete="off"
            required
            defaultValue={monto.toFixed(2)}
            onInput={(e) => {
              const limpio = limpiarMonto(e.currentTarget.value);
              if (limpio !== e.currentTarget.value) e.currentTarget.value = limpio;
            }}
            aria-invalid={Boolean(estado.errores?.monto)}
            className="rounded-xl bg-tarjeta px-3 py-2.5 text-[17px] tabular-nums outline-none cifra-campo"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="px-1 text-[13px] text-texto-2">Fecha</span>
          <input
            type="date"
            name="fecha"
            required
            defaultValue={fecha}
            min={despuesDe}
            aria-invalid={Boolean(estado.errores?.fecha)}
            className="min-w-0 rounded-xl bg-tarjeta px-3 py-2.5 text-[17px] outline-none"
          />
        </label>
      </div>
      <MensajeError texto={estado.errores?.monto ?? estado.errores?.fecha ?? estado.error} />
      {estado.ok && (
        <p role="status" className="px-1 text-[13px] font-semibold text-verde">
          Guardado. Desde ahí se repite con estos datos.
        </p>
      )}
      <BotonEnviar texto="Guardar cambio" textoEnviando="Guardando…" clase="bg-azul-relleno text-white" />
    </form>
  );
}
