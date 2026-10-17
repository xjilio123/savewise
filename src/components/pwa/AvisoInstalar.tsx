"use client";

import { useSyncExternalStore } from "react";
import { Icono } from "@/components/Icono";
import { esIOS, estaInstalada } from "@/lib/dispositivo";

const CLAVE = "savewise:aviso-instalar-cerrado";
const EVENTO = "savewise:aviso-instalar";

const suscribir = (avisar: () => void) => {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
};

function debeMostrarse() {
  try {
    return esIOS() && !estaInstalada() && localStorage.getItem(CLAVE) !== "1";
  } catch {
    return false;
  }
}

/** En Safari de iPhone (sin instalar) explica cómo añadir SaveWise a la pantalla de inicio. */
export function AvisoInstalar() {
  const visible = useSyncExternalStore(suscribir, debeMostrarse, () => false);
  if (!visible) return null;

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {
      // Sin almacenamiento: el aviso volverá a aparecer, no es grave.
    }
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <div className="flex items-start gap-3 rounded-[22px] bg-azul-relleno/12 px-5 py-4">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-azul-relleno text-white">
        <Icono nombre="compartir" className="size-5" />
      </span>
      <p className="flex-1 text-[15px] leading-snug">
        <span className="block font-semibold">Instala SaveWise en tu iPhone</span>
        Toca <span className="font-semibold">Compartir</span> y luego <span className="font-semibold">Añadir a pantalla de inicio</span>.
        Se abrirá a pantalla completa y podrás recibir avisos.
      </p>
      <button type="button" onClick={cerrar} aria-label="Cerrar aviso" className="-mr-1 -mt-1 p-1 text-[22px] leading-none text-texto-2">
        ×
      </button>
    </div>
  );
}
