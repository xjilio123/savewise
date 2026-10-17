"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { cerrarPeriodo, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";

const EVENTO = "savewise:cierre";
const suscribir = (avisar: () => void) => {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
};

/** Ofrece mandar a una meta lo que quedó sin asignar en el periodo anterior. */
export function CierreMes({
  clave,
  periodo,
  sobrante,
  metas,
}: {
  clave: string;
  periodo: string;
  sobrante: string;
  metas: { id: string; nombre: string }[];
}) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(cerrarPeriodo, {});
  const descartada = useSyncExternalStore(
    suscribir,
    () => {
      try {
        return localStorage.getItem(`savewise:cierre:${clave}`) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  if (descartada || estado.ok) return null;

  function ahoraNo() {
    try {
      localStorage.setItem(`savewise:cierre:${clave}`, "1");
    } catch {
      // Sin almacenamiento: volverá a aparecer, no es grave.
    }
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-verde-relleno/12 px-5 py-4">
      <p className="text-[16px] leading-snug">
        <span className="font-semibold">Cierre de {periodo}:</span> te sobraron <b className="monto">{sobrante}</b> sin asignar. ¿Los mandas a
        una meta?
      </p>
      {metas.length === 0 ? (
        <Link href="/ahorros" className="text-[15px] font-semibold text-verde">
          Crea una meta primero ›
        </Link>
      ) : (
        <form action={accion} className="flex flex-col gap-2.5">
          <select name="meta_id" required defaultValue={metas[0]?.id} aria-label="Meta" className="rounded-2xl bg-tarjeta px-4 py-3 outline-none">
            {metas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          <BotonEnviar texto="Mandar a la meta" textoEnviando="Enviando…" clase="bg-verde text-fondo" />
        </form>
      )}
      <MensajeError texto={estado.error} />
      <button type="button" onClick={ahoraNo} className="w-fit text-[15px] text-texto-2">
        Ahora no
      </button>
    </section>
  );
}
