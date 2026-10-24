"use client";

import { useActionState } from "react";
import { guardarMovimiento, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { ConMontos } from "@/components/Monto";
import { Alerta } from "@/components/ui";
import { formatearDinero, SIN_DINERO_PARA_BOLSA } from "@/lib/dinero";

/**
 * Suma dinero a la bolsa "Para mí" del mes. Cada aporte resta de lo que queda sin asignar, así que
 * no se puede sumar más de lo que hay (el servidor lo vuelve a revisar al guardar).
 */
export function FormularioBolsa({
  hoy,
  actual,
  disponible,
  moneda,
}: {
  hoy: string;
  actual: number;
  disponible: number;
  moneda: string;
}) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(guardarMovimiento, {});
  const sinDinero = disponible <= 0;

  return (
    <form key={estado.valores?.monto ?? "inicial"} action={accion} className="flex flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-semibold text-texto-2">
          {actual > 0 ? "Sumar a la bolsa del mes" : "Asigna tu bolsa de este mes"}
        </p>
        {!sinDinero && (
          <p className="text-[13px] text-texto-2 tabular-nums">
            Sin asignar: <ConMontos texto={formatearDinero(disponible, moneda)} />
          </p>
        )}
      </div>
      {sinDinero ? (
        <Alerta texto={SIN_DINERO_PARA_BOLSA} enTarjeta />
      ) : (
        <>
          <input type="hidden" name="tipo" value="PARA_MI" />
          <input type="hidden" name="concepto" value="Bolsa del mes" />
          <input type="hidden" name="fecha" value={hoy} />
          <div className="flex gap-3">
            <input
              name="monto"
              inputMode="decimal"
              required
              placeholder="Monto"
              defaultValue={estado.valores?.monto}
              aria-label="Monto para la bolsa"
              aria-invalid={Boolean(estado.errores?.monto ?? estado.bloqueo)}
              className="min-w-0 flex-1 rounded-2xl bg-fondo px-4 py-3 text-[17px] tabular-nums outline-none cifra-campo"
            />
            <div className="w-32">
              <BotonEnviar texto="Asignar" textoEnviando="…" clase="bg-morado text-fondo" />
            </div>
          </div>
          {(estado.bloqueo ?? estado.errores?.monto ?? estado.error) && (
            <Alerta texto={(estado.bloqueo ?? estado.errores?.monto ?? estado.error)!} enTarjeta />
          )}
        </>
      )}
    </form>
  );
}
