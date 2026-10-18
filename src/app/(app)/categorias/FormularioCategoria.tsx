"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";
import { CLASES_COLOR, COLORES_CATEGORIA, NOMBRE_COLOR } from "@/lib/colores";
import type { ColorApp } from "@/lib/supabase/tipos";

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

/**
 * Crear o editar una categoría. Los colores que ya usan otras categorías aparecen tachados y no
 * se pueden elegir: cada categoría tiene su propio color (la base lo exige con un índice único).
 */
export function FormularioCategoria({
  accion,
  ocupados,
  inicial,
  textoBoton,
}: {
  accion: Accion;
  ocupados: ColorApp[];
  inicial?: { nombre: string; color: ColorApp };
  textoBoton: string;
}) {
  const [estado, enviar] = useActionState<EstadoFormulario, FormData>(accion, {});
  const errores = estado.errores ?? {};
  const libres = COLORES_CATEGORIA.filter((c) => !ocupados.includes(c));
  const elegido = inicial?.color ?? libres[0];

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <input
        name="nombre"
        maxLength={40}
        required
        defaultValue={inicial?.nombre}
        placeholder="Nombre, por ejemplo Mascotas"
        aria-label="Nombre de la categoría"
        className="rounded-2xl bg-fondo px-4 py-3 text-[17px] outline-none"
      />
      <MensajeError texto={errores.nombre} />
      <fieldset className="flex flex-col gap-2">
        <legend className="px-1 pb-2 text-[13px] text-texto-2">Color · los apagados ya los usa otra categoría</legend>
        <div className="grid grid-cols-6 gap-2.5">
          {COLORES_CATEGORIA.map((c) => {
            const ocupado = ocupados.includes(c);
            return (
              <label key={c} className={`relative grid place-items-center ${ocupado ? "opacity-25" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="color"
                  value={c}
                  defaultChecked={c === elegido}
                  disabled={ocupado}
                  aria-label={`${NOMBRE_COLOR[c]}${ocupado ? " (ya en uso)" : ""}`}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`size-10 rounded-full ${CLASES_COLOR[c].punto} ring-offset-2 ring-offset-tarjeta peer-checked:ring-2 peer-checked:ring-texto peer-focus-visible:ring-2 peer-focus-visible:ring-azul`}
                />
              </label>
            );
          })}
        </div>
      </fieldset>
      <MensajeError texto={errores.color ?? estado.error} />
      {libres.length === 0 && !inicial ? (
        <p className="text-[15px] text-texto-2">Ya usas los 12 colores. Elimina o cambia una categoría para crear otra.</p>
      ) : (
        <BotonEnviar texto={textoBoton} />
      )}
    </form>
  );
}
