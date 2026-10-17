"use client";

import { useSyncExternalStore } from "react";
import { COOKIE_PRIVADO } from "@/lib/tema";

const ojo = "M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z";
const ojoTachado = "M3 3l18 18M10.6 5.1A9.9 9.9 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2";

// El estado vive en <html data-privado> (lo pone el servidor desde la cookie). Todos los ojos
// de la pantalla lo leen de ahí, así que siempre están de acuerdo.
function suscribir(aviso: () => void) {
  const observador = new MutationObserver(aviso);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-privado"] });
  return () => observador.disconnect();
}
const leer = () => document.documentElement.hasAttribute("data-privado");

/**
 * Oculta las cifras (S/ ••••) para usar la app en público. Los dos íconos se pintan y el CSS
 * elige cuál se ve, así el botón es correcto desde el primer instante, sin esperar a JavaScript.
 */
export function BotonPrivado({ grande = false }: { grande?: boolean }) {
  const privado = useSyncExternalStore(suscribir, leer, () => false);

  function alternar() {
    const nuevo = !leer();
    document.documentElement.toggleAttribute("data-privado", nuevo);
    const seguro = location.protocol === "https:" ? "; secure" : "";
    document.cookie = nuevo
      ? `${COOKIE_PRIVADO}=1; path=/; max-age=31536000; samesite=lax${seguro}`
      : `${COOKIE_PRIVADO}=; path=/; max-age=0; samesite=lax${seguro}`;
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={privado}
      aria-label="Ocultar montos"
      className={`grid shrink-0 place-items-center rounded-full bg-tarjeta text-texto-2 active:scale-95 ${grande ? "size-12" : "size-10"}`}
    >
      {[ojo, ojoTachado].map((trazo, i) => (
        <svg
          key={trazo}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${grande ? "size-6" : "size-[22px]"} ${i === 0 ? "ojo-abierto" : "ojo-cerrado"}`}
          aria-hidden="true"
        >
          <path d={trazo} />
        </svg>
      ))}
    </button>
  );
}
