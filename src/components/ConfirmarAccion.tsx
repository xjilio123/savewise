"use client";

import { useId, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  /** Acción que se ejecuta solo si se confirma (Server Action o función). */
  accion: (formData: FormData) => void | Promise<void>;
  /** Contenido del botón que abre la confirmación. */
  children: ReactNode;
  claseBoton: string;
  titulo: string;
  mensaje: string;
  /** Texto del botón rojo de la alerta, por ejemplo "Eliminar". */
  confirmar: string;
  confirmando?: string;
  /** Campos que la acción necesita (por ejemplo, a qué meta mover los aportes). Van dentro del formulario. */
  campos?: ReactNode;
};

/**
 * Botones de la alerta. Sin anillo de foco: el iPhone lo pintaba como líneas celestes porque
 * "Cancelar" empieza enfocado. Como en las alertas nativas, se marca con un gris suave
 * al tocar o al navegar con teclado.
 */
const BOTON_ALERTA =
  "w-full py-3 text-[17px] font-semibold outline-none transition-colors active:bg-control focus-visible:bg-control";

function BotonConfirmar({ texto, enviando }: { texto: string; enviando: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${BOTON_ALERTA} text-rojo disabled:opacity-60`}
    >
      {pending ? enviando : texto}
    </button>
  );
}

/**
 * Doble validación para acciones que borran o cambian algo: el botón abre una alerta al estilo
 * de iOS y la acción solo corre al confirmar. Usa <dialog> nativo: atrapa el foco, se cierra con
 * Escape y no necesita librerías. El foco inicial va al recuadro (no a un botón): así Enter
 * nunca borra por accidente y no se pinta ningún botón como seleccionado al abrir.
 */
export function ConfirmarAccion({
  accion,
  children,
  claseBoton,
  titulo,
  mensaje,
  confirmar,
  confirmando = "Un momento…",
  campos,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idMensaje = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialogo.current?.showModal();
          dialogo.current?.focus();
        }}
        className={claseBoton}
      >
        {children}
      </button>
      <dialog
        ref={dialogo}
        tabIndex={-1}
        aria-labelledby={idTitulo}
        aria-describedby={idMensaje}
        // Tocar fuera de la alerta la cierra, como en iOS.
        onClick={(e) => e.target === e.currentTarget && dialogo.current?.close()}
        className="m-auto w-[min(300px,calc(100vw-48px))] overflow-hidden rounded-[18px] bg-tarjeta p-0 text-texto shadow-2xl outline-none backdrop:bg-black/45 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex flex-col gap-1 px-5 pt-5 pb-4 text-center">
          <h2 id={idTitulo} className="text-[17px] font-semibold">
            {titulo}
          </h2>
          <p id={idMensaje} className="text-[13px] leading-snug text-texto-2">
            {mensaje}
          </p>
        </div>
        <form
          // La alerta sigue abierta mientras trabaja ("Eliminando…"); si la acción no redirige, se cierra al terminar.
          action={async (datos) => {
            await accion(datos);
            dialogo.current?.close();
          }}
          className="border-t border-linea"
        >
          {campos && <div className="px-5 pt-3">{campos}</div>}
          <BotonConfirmar texto={confirmar} enviando={confirmando} />
        </form>
        <button
          type="button"
          onClick={() => dialogo.current?.close()}
          className={`${BOTON_ALERTA} border-t border-linea text-azul`}
        >
          Cancelar
        </button>
      </dialog>
    </>
  );
}
