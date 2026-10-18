"use client";

import { useActionState } from "react";
import { crearDeuda, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";

const campo = "rounded-2xl bg-fondo px-4 py-3 text-[17px] outline-none";

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
export type ValoresDeuda = {
  nombre: string;
  tipo: string;
  monto_total: string;
  cuota_mensual: string;
  dia_pago: string;
  tea: string;
};

/**
 * Formulario de deudas. Sin props crea una deuda nueva (desplegable en Deudas);
 * con `accion` e `inicial` edita una existente con sus valores ya cargados.
 */
export function FormularioDeuda({ accion, inicial }: { accion?: Accion; inicial?: ValoresDeuda } = {}) {
  const [estado, enviar] = useActionState<EstadoFormulario, FormData>(accion ?? crearDeuda, {});
  const errores = estado.errores ?? {};
  const v = inicial;

  const formulario = (
    <form action={enviar} className={`flex flex-col gap-3 ${accion ? "" : "p-3"}`}>
      <label className="flex flex-col gap-1">
        {accion && <span className="px-1 text-[13px] text-texto-2">Nombre</span>}
        <input name="nombre" maxLength={60} required defaultValue={v?.nombre} placeholder="Nombre, por ejemplo Visa BCP" className={campo} />
      </label>
      <MensajeError texto={errores.nombre} />
      <label className="flex items-center justify-between rounded-2xl bg-fondo px-4 py-3 text-[17px]">
        <span>Tipo</span>
        <select name="tipo" defaultValue={v?.tipo ?? "tarjeta"} className="bg-transparent text-right text-texto-2 outline-none">
          <option value="tarjeta">Tarjeta de crédito</option>
          <option value="prestamo">Préstamo</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        {accion && <span className="px-1 text-[13px] text-texto-2">Cuánto debías al registrarla</span>}
        <input
          name="monto_total"
          inputMode="decimal"
          required
          defaultValue={v?.monto_total}
          placeholder="Cuánto debes hoy"
          className={`${campo} tabular-nums cifra-campo`}
        />
      </label>
      <MensajeError texto={errores.monto_total} />
      <label className="flex flex-col gap-1">
        {accion && <span className="px-1 text-[13px] text-texto-2">Cuota mensual</span>}
        <input
          name="cuota_mensual"
          inputMode="decimal"
          defaultValue={v?.cuota_mensual}
          placeholder="Cuota mensual (opcional)"
          className={`${campo} tabular-nums cifra-campo`}
        />
      </label>
      <MensajeError texto={errores.cuota_mensual} />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          {accion && <span className="px-1 text-[13px] text-texto-2">Día de pago</span>}
          <input name="dia_pago" inputMode="numeric" defaultValue={v?.dia_pago} placeholder="Día de pago" className={campo} />
        </label>
        <label className="flex flex-col gap-1">
          {accion && <span className="px-1 text-[13px] text-texto-2">TEA %</span>}
          <input name="tea" inputMode="decimal" defaultValue={v?.tea} placeholder="TEA %" className={campo} />
        </label>
      </div>
      <MensajeError texto={errores.dia_pago ?? errores.tea ?? errores.tipo ?? estado.error} />
      <p className="px-1 text-[13px] leading-snug text-texto-2">
        La TEA figura en tu estado de cuenta. Con ella estimamos cuánto falta; con el día de pago te avisamos un día antes.
      </p>
      <BotonEnviar texto={accion ? "Guardar cambios" : "Guardar deuda"} clase={accion ? undefined : "bg-rojo text-fondo"} />
    </form>
  );

  if (accion) return <div className="rounded-[22px] bg-tarjeta p-4">{formulario}</div>;

  return (
    <details className="group rounded-[22px] border-2 border-dashed border-linea p-1 open:border-solid open:bg-tarjeta">
      <summary className="cursor-pointer list-none py-3 text-center text-[17px] font-semibold text-azul">
        + Nueva deuda o tarjeta
      </summary>
      {formulario}
    </details>
  );
}
