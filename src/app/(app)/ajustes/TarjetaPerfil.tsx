"use client";

import { useActionState, useState } from "react";
import { guardarColorPerfil, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";
import {
  clasesCirculoPerfil,
  COLORES_CATEGORIA,
  fondoColorPerfil,
  NOMBRE_COLOR,
  type ColorPerfil,
} from "@/lib/colores";

const OPCIONES: (ColorPerfil | null)[] = [null, ...COLORES_CATEGORIA];
const nombreDe = (c: ColorPerfil | null) => (c ? NOMBRE_COLOR[c] : "Original");

/**
 * Tu nombre, tu correo y el círculo con tu inicial. «Editar» abre los colores; el círculo muestra el
 * elegido al momento, pero solo se guarda con «Guardar». «Cancelar» vuelve al color guardado.
 */
export function TarjetaPerfil({
  inicial,
  nombre,
  correo,
  color,
}: {
  inicial: string;
  nombre: string;
  correo: string;
  color: ColorPerfil | null;
}) {
  const [editando, setEditando] = useState(false);
  const [elegido, setElegido] = useState(color);
  const [estado, enviar] = useActionState<EstadoFormulario, FormData>(async (anterior, formData) => {
    const resultado = await guardarColorPerfil(anterior, formData);
    if (resultado.ok) setEditando(false);
    return resultado;
  }, {});

  const visible = editando ? elegido : color;

  return (
    <section className="flex flex-col gap-4 rounded-[22px] bg-tarjeta p-4">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className={`grid size-14 shrink-0 place-items-center rounded-full text-[24px] font-bold transition-colors ${clasesCirculoPerfil(visible)}`}
        >
          {inicial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold">{nombre}</p>
          <p className="truncate text-[15px] text-texto-2">{correo}</p>
        </div>
        {!editando && (
          <button
            type="button"
            onClick={() => {
              setElegido(color);
              setEditando(true);
            }}
            className="shrink-0 rounded-full bg-control px-4 py-2 text-[15px] font-semibold text-azul"
          >
            Editar
          </button>
        )}
      </div>

      {!editando && estado.ok && (
        <p role="status" className="text-[13px] text-texto-2">
          Color guardado: {nombreDe(color)}
        </p>
      )}

      {editando && (
        <form action={enviar} className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="px-1 pb-2 text-[13px] text-texto-2">
              Color de tu perfil · <span className="font-semibold text-texto">{nombreDe(elegido)}</span>
            </legend>
            <div className="grid grid-cols-7 gap-1.5">
              {OPCIONES.map((c) => (
                <label key={c ?? "original"} className="grid size-11 cursor-pointer place-items-center">
                  <input
                    type="radio"
                    name="color"
                    value={c ?? "original"}
                    checked={c === elegido}
                    onChange={() => setElegido(c)}
                    aria-label={nombreDe(c)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`size-9 rounded-full ${fondoColorPerfil(c)} ring-offset-2 ring-offset-tarjeta peer-checked:ring-2 peer-checked:ring-texto peer-focus-visible:ring-2 peer-focus-visible:ring-azul`}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <MensajeError texto={estado.error} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setElegido(color);
                setEditando(false);
              }}
              className="flex-1 rounded-[20px] bg-control py-4 text-[17px] font-semibold"
            >
              Cancelar
            </button>
            <div className="flex-1">
              <BotonEnviar texto="Guardar" />
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
