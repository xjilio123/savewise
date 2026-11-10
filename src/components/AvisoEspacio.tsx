import Link from "next/link";
import { Barra } from "@/components/Anillos";
import { BotonRespaldo } from "@/components/BotonRespaldo";
import { Icono } from "@/components/Icono";
import { CUPO_PERSONA, estadoEspacio } from "@/lib/espacio";

/** Tarjeta de Inicio cuando tu espacio pasa el 90%. No bloquea nada: solo pide descargar el respaldo. */
export function AvisoEspacio({ bytes }: { bytes: number }) {
  const estado = estadoEspacio(bytes, CUPO_PERSONA);
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-rojo text-fondo">
          <Icono nombre="alerta" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold">Tu espacio está casi lleno</h2>
          <p className="text-[13px] text-texto-2 tabular-nums">
            {estado.usado} de {estado.total} · {estado.porcentaje}
          </p>
        </div>
      </div>
      <Barra fraccion={estado.fraccion} clase="text-rojo" />
      <p className="text-[15px] leading-snug text-texto-2">
        Descarga tu respaldo para no perder nada. Puedes seguir registrando como siempre.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <BotonRespaldo className="rounded-[14px] bg-verde py-2.5 text-center text-[15px] font-semibold text-fondo active:scale-[0.98]">
          Descargar respaldo
        </BotonRespaldo>
        <Link
          href="/ajustes#tus-datos"
          className="rounded-[14px] bg-fondo py-2.5 text-center text-[15px] font-semibold text-azul active:scale-[0.98]"
        >
          Ver en Ajustes
        </Link>
      </div>
    </section>
  );
}
