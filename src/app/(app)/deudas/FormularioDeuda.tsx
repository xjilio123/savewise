"use client";

import { useActionState } from "react";
import { crearDeuda, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";

const campo = "rounded-2xl bg-fondo px-4 py-3 text-[17px] outline-none";

export function FormularioDeuda() {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(crearDeuda, {});
  const errores = estado.errores ?? {};

  return (
    <details className="group rounded-[22px] border-2 border-dashed border-linea p-1 open:border-solid open:bg-tarjeta">
      <summary className="cursor-pointer list-none py-3 text-center text-[17px] font-semibold text-azul">
        + Nueva deuda o tarjeta
      </summary>
      <form action={accion} className="flex flex-col gap-3 p-3">
        <input name="nombre" maxLength={60} required placeholder="Nombre, por ejemplo Visa BCP" className={campo} />
        <MensajeError texto={errores.nombre} />
        <label className="flex items-center justify-between rounded-2xl bg-fondo px-4 py-3 text-[17px]">
          <span>Tipo</span>
          <select name="tipo" defaultValue="tarjeta" className="bg-transparent text-right text-texto-2 outline-none">
            <option value="tarjeta">Tarjeta de crédito</option>
            <option value="prestamo">Préstamo</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <input name="monto_total" inputMode="decimal" required placeholder="Cuánto debes hoy" className={campo} />
        <MensajeError texto={errores.monto_total} />
        <input name="cuota_mensual" inputMode="decimal" placeholder="Cuota mensual (opcional)" className={campo} />
        <MensajeError texto={errores.cuota_mensual} />
        <div className="grid grid-cols-2 gap-3">
          <input name="dia_pago" inputMode="numeric" placeholder="Día de pago" className={campo} />
          <input name="tea" inputMode="decimal" placeholder="TEA %" className={campo} />
        </div>
        <MensajeError texto={errores.dia_pago ?? errores.tea ?? errores.tipo ?? estado.error} />
        <p className="px-1 text-[13px] leading-snug text-texto-2">
          La TEA figura en tu estado de cuenta. Con ella estimamos cuánto falta; con el día de pago te avisamos un día antes.
        </p>
        <BotonEnviar texto="Guardar deuda" clase="bg-rojo text-fondo" />
      </form>
    </details>
  );
}
