"use client";

import { useActionState, type ReactNode } from "react";
import { guardarTopes, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";
import { ConMontos } from "@/components/Monto";

type Fila = { id: string; nombre: string; punto: string; tope: number | null; detalle: string | null; barra: ReactNode };

export function FormularioTopes({ categorias, moneda }: { categorias: Fila[]; moneda: string }) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(guardarTopes, {});

  return (
    <form action={accion} className="flex flex-col gap-4">
      <ul className="divide-y divide-linea overflow-hidden rounded-[22px] bg-tarjeta">
        {categorias.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 px-4 py-3">
            <label className="flex items-center gap-3">
              <span className={`size-3.5 shrink-0 rounded-full ${c.punto}`} aria-hidden="true" />
              <span className="flex-1 text-[17px]">{c.nombre}</span>
              <span className="text-[15px] text-texto-2">{moneda}</span>
              <input
                name={`tope_${c.id}`}
                inputMode="decimal"
                defaultValue={c.tope ? c.tope.toFixed(2) : ""}
                placeholder="Sin tope"
                aria-label={`Tope de ${c.nombre}`}
                className="w-28 rounded-xl bg-fondo px-3 py-2 text-right tabular-nums outline-none cifra-campo"
              />
            </label>
            {c.barra && (
              <div className="flex flex-col gap-1 pl-6">
                {c.barra}
                <span className="text-[13px] text-texto-2"><ConMontos texto={c.detalle ?? ""} /></span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <MensajeError texto={estado.error} />
      {estado.ok && (
        <p role="status" className="text-[15px] font-semibold text-verde">
          Topes guardados.
        </p>
      )}
      <BotonEnviar texto="Guardar topes" clase="bg-azul-relleno text-white" />
    </form>
  );
}
