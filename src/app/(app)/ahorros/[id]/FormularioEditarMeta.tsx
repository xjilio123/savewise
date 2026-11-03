"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

const fila = "flex items-center justify-between gap-4 py-3.5";
const campo = "min-w-0 flex-1 bg-transparent text-right text-[17px] text-texto-2 outline-none";

export function FormularioEditarMeta({
  accion,
  inicial,
}: {
  accion: Accion;
  inicial: { nombre: string; objetivo: string; fecha_objetivo: string; saldo_inicial: string };
}) {
  const [estado, enviar] = useActionState<EstadoFormulario, FormData>(accion, {});
  const errores = estado.errores ?? {};

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <div className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
        <label className={fila}>
          <span className="text-[17px]">Nombre</span>
          <input name="nombre" maxLength={60} required defaultValue={inicial.nombre} className={campo} />
        </label>
        <label className={fila}>
          <span className="text-[17px]">Objetivo</span>
          <input
            name="objetivo"
            inputMode="decimal"
            required
            defaultValue={inicial.objetivo}
            className={`${campo} tabular-nums cifra-campo`}
          />
        </label>
        <label className={fila}>
          <span className="text-[17px]">Ya tenías ahorrado</span>
          <input
            name="saldo_inicial"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={inicial.saldo_inicial}
            className={`${campo} tabular-nums cifra-campo`}
          />
        </label>
        <label className={fila}>
          <span className="text-[17px]">Fecha límite</span>
          <input type="date" name="fecha_objetivo" defaultValue={inicial.fecha_objetivo} className={campo} />
        </label>
      </div>
      <p className="-mt-2 px-4 text-[13px] leading-snug text-texto-2">
        «Ya tenías ahorrado» es lo que juntaste antes de crear la meta. Suma a tu avance, pero no sale de tu sueldo
        ni de «Sin asignar».
      </p>
      <MensajeError
        texto={errores.nombre ?? errores.objetivo ?? errores.saldo_inicial ?? errores.fecha_objetivo ?? estado.error}
      />
      <BotonEnviar texto="Guardar cambios" />
    </form>
  );
}
