"use client";

import { useActionState } from "react";
import { pedirResumenIA } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import type { ResultadoIA } from "@/lib/ia";

export function ResumenIA() {
  const [estado, accion] = useActionState<ResultadoIA>(() => pedirResumenIA(), {});

  return (
    <section aria-live="polite" className="flex flex-col gap-3 rounded-[22px] bg-tinte-morado px-5 py-4">
      <div>
        <p className="text-[17px] font-semibold">Resumen con IA</p>
        <p className="text-[13px] leading-snug text-texto-2">
          Solo se envían totales y nombres de categorías a Google Gemini; nunca tus conceptos ni notas.
        </p>
      </div>
      {/* Texto plano: React lo escapa, la respuesta nunca se interpreta como HTML. */}
      {estado.texto && <p className="whitespace-pre-line text-[15px] leading-relaxed">{estado.texto}</p>}
      {estado.error && <p className="text-[15px] text-rojo">{estado.error}</p>}
      <form action={accion}>
        <BotonEnviar
          texto={estado.texto ? "Generar otro" : "Resumir mi mes"}
          textoEnviando="Pensando…"
          clase="bg-morado text-fondo"
        />
      </form>
    </section>
  );
}
