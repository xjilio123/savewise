"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { pedirResumenIA } from "@/app/acciones";
import { ConMontos } from "@/components/Monto";
import { formatoEspera, restantesIA, siguienteEstadoIA, TOPE_DIARIO_IA, type EstadoIA } from "@/lib/usoIA";

/** Segundos que faltan, bajando de a uno. Se reinicia al cambiar la `key` del componente que lo usa. */
function useCuentaRegresiva(segundos: number): number {
  const [restante, setRestante] = useState(segundos);
  useEffect(() => {
    if (segundos <= 0) return;
    const fin = Date.now() + segundos * 1000;
    const id = setInterval(() => {
      const r = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      setRestante(r);
      if (r === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [segundos]);
  return restante;
}

function BotonResumen({ espera, agotado, hayTexto }: { espera: number; agotado: boolean; hayTexto: boolean }) {
  const restante = useCuentaRegresiva(espera);
  const { pending } = useFormStatus();
  const texto = pending
    ? "Pensando…"
    : agotado
      ? "Vuelve mañana"
      : restante > 0
        ? `Podrás generar otro en ${formatoEspera(restante)}`
        : hayTexto
          ? "Generar otro"
          : "Resumir mi mes";

  return (
    <button
      type="submit"
      disabled={pending || agotado || restante > 0}
      className="w-full rounded-[20px] bg-morado py-4 text-[17px] font-bold text-fondo tabular-nums transition active:scale-[0.98] disabled:opacity-60"
    >
      {texto}
    </button>
  );
}

function BotonCopiar({ texto }: { texto: string }) {
  const [aviso, setAviso] = useState("");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Copiado");
    } catch {
      setAviso("No se pudo copiar");
    }
    setTimeout(() => setAviso(""), 2000);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="self-end rounded-full bg-tarjeta px-4 py-2 text-[15px] font-semibold text-morado active:scale-95"
    >
      {aviso || "Copiar"}
    </button>
  );
}

/**
 * Resumen del mes con IA. Máximo 10 al día y 2 minutos entre uno y otro (15 s tras un error);
 * el último de hoy queda guardado. Las reglas las hace cumplir la base de datos.
 */
export function ResumenIA({ texto, usados, espera }: { texto: string | null; usados: number; espera: number }) {
  const [estado, accion] = useActionState<EstadoIA>(
    async (previo) => siguienteEstadoIA(previo, await pedirResumenIA(), Date.now()),
    { texto, usados, espera, marca: 0 },
  );
  const quedan = restantesIA(estado.usados);

  return (
    <section aria-live="polite" className="flex flex-col gap-3 rounded-[22px] bg-tinte-morado px-5 py-4">
      <div>
        <p className="text-[17px] font-semibold">Resumen con IA</p>
        <p className="text-[13px] leading-snug text-texto/75">
          Solo se envían totales y nombres de categorías a Google Gemini; nunca tus conceptos ni notas.
        </p>
      </div>
      {/* Texto plano: React lo escapa, la respuesta nunca se interpreta como HTML. */}
      {estado.texto && (
        <>
          <p className="whitespace-pre-line text-[15px] leading-relaxed">
            <ConMontos texto={estado.texto} />
          </p>
          <BotonCopiar texto={estado.texto} />
        </>
      )}
      {estado.error && quedan > 0 && <p className="text-[15px] text-rojo">{estado.error}</p>}
      <form action={accion} className="flex flex-col gap-2">
        <BotonResumen key={estado.marca} espera={estado.espera} agotado={quedan === 0} hayTexto={Boolean(estado.texto)} />
        <p className="text-center text-[13px] text-texto/75">
          {quedan === 0
            ? `Usaste tus ${TOPE_DIARIO_IA} resúmenes de hoy. Mañana tienes ${TOPE_DIARIO_IA} más.`
            : `Te quedan ${quedan} de ${TOPE_DIARIO_IA} hoy`}
        </p>
      </form>
    </section>
  );
}
