"use client";

import { useSyncExternalStore } from "react";
import { Icono } from "@/components/Icono";
import { esAndroid, esIOS, estaInstalada } from "@/lib/dispositivo";
import { EVENTO_INSTALAR, instalar, puedeInstalar } from "@/lib/instalacion";

const CLAVE = "savewise:aviso-instalar-cerrado";

type Aviso = "ninguno" | "ios" | "android-boton" | "android-menu";

const suscribir = (avisar: () => void) => {
  window.addEventListener(EVENTO_INSTALAR, avisar);
  return () => window.removeEventListener(EVENTO_INSTALAR, avisar);
};

function queAviso(): Aviso {
  try {
    if (estaInstalada() || localStorage.getItem(CLAVE) === "1") return "ninguno";
    if (esIOS()) return "ios";
    if (esAndroid()) return puedeInstalar() ? "android-boton" : "android-menu";
    return "ninguno";
  } catch {
    return "ninguno";
  }
}

/**
 * Si SaveWise todavía no está instalada, explica cómo instalarla. En iPhone se hace a mano desde
 * Compartir; en Android, Chrome permite instalarla con un botón (o desde su menú ⋮).
 */
export function AvisoInstalar() {
  const aviso = useSyncExternalStore(suscribir, queAviso, () => "ninguno" as Aviso);
  if (aviso === "ninguno") return null;

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {
      // Sin almacenamiento: el aviso volverá a aparecer, no es grave.
    }
    window.dispatchEvent(new Event(EVENTO_INSTALAR));
  }

  return (
    <div className="flex items-start gap-3 rounded-[22px] bg-azul-relleno/12 px-5 py-4">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-azul-relleno text-white">
        <Icono nombre={aviso === "ios" ? "compartir" : "mas"} className="size-5" />
      </span>
      <div className="flex flex-1 flex-col gap-2 text-[15px] leading-snug">
        {aviso === "ios" ? (
          <p>
            <span className="block font-semibold">Instala SaveWise en tu iPhone</span>
            Toca <span className="font-semibold">Compartir</span> y luego{" "}
            <span className="font-semibold">Añadir a pantalla de inicio</span>. Se abrirá a pantalla completa y podrás recibir
            avisos.
          </p>
        ) : (
          <p>
            <span className="block font-semibold">Instala SaveWise en tu teléfono</span>
            {aviso === "android-boton" ? (
              "Queda en tu pantalla de inicio, se abre a pantalla completa y funciona sin conexión."
            ) : (
              <>
                En Chrome toca el menú <span className="font-semibold">⋮</span> y luego{" "}
                <span className="font-semibold">Instalar app</span>.
              </>
            )}
          </p>
        )}
        {aviso === "android-boton" && (
          <button
            type="button"
            onClick={() => void instalar()}
            className="w-fit rounded-full bg-azul-relleno px-4 py-1.5 text-[15px] font-semibold text-white"
          >
            Instalar
          </button>
        )}
      </div>
      <button type="button" onClick={cerrar} aria-label="Cerrar aviso" className="-mr-1 -mt-1 p-1 text-[22px] leading-none text-texto-2">
        ×
      </button>
    </div>
  );
}
