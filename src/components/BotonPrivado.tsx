"use client";

import { useState } from "react";
import { COOKIE_PRIVADO } from "@/lib/tema";

const ojo = "M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z";
const ojoTachado = "M3 3l18 18M10.6 5.1A9.9 9.9 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2";

/**
 * Oculta las cifras (las difumina) para usar la app en público. Se recuerda con una cookie
 * que el servidor lee, así la página ya llega oculta y no se ve ningún monto ni por un instante.
 */
export function BotonPrivado({ inicial }: { inicial: boolean }) {
  const [privado, setPrivado] = useState(inicial);

  function alternar() {
    const nuevo = !privado;
    setPrivado(nuevo);
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
      aria-label={privado ? "Mostrar montos" : "Ocultar montos"}
      className="grid size-12 place-items-center rounded-full bg-tarjeta text-texto-2 active:scale-95"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden="true">
        <path d={privado ? ojoTachado : ojo} />
      </svg>
    </button>
  );
}
