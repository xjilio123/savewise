"use client";

import { useActionState } from "react";
import { guardarPerfil, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { ConMontos } from "@/components/Monto";
import { MensajeError } from "@/components/ui";
import { MONEDAS } from "@/lib/validacion";

const nombres: Record<(typeof MONEDAS)[number], string> = {
  PEN: "Sol peruano",
  USD: "Dólar de EE. UU.",
  EUR: "Euro",
  MXN: "Peso mexicano",
  COP: "Peso colombiano",
  CLP: "Peso chileno",
  ARS: "Peso argentino",
};

export function FormularioPerfil({
  sueldo,
  moneda,
  diaPago,
  textoBoton,
}: {
  sueldo: number;
  moneda: string;
  diaPago: number;
  textoBoton: string;
}) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(guardarPerfil, {});
  const errores = estado.errores ?? {};
  // Tras un aviso, el formulario se vuelve a montar con lo que se escribió (React lo vacía al enviar).
  const v = estado.valores;
  const sueldoInicial = v ? Number(v.sueldo_mensual) : sueldo;

  return (
    <form key={v ? Object.values(v).join("|") : "inicial"} action={accion} className="flex flex-col gap-5">
      {v && <input type="hidden" name="confirmar_sueldo" value={v.sueldo_mensual} />}
      <div className="flex flex-col items-center gap-2 rounded-[24px] bg-tarjeta px-5 py-6">
        <label htmlFor="sueldo_mensual" className="text-[15px] font-semibold text-texto-2">
          Sueldo mensual
        </label>
        <input
          id="sueldo_mensual"
          name="sueldo_mensual"
          inputMode="decimal"
          required
          defaultValue={sueldoInicial > 0 ? sueldoInicial.toFixed(2) : ""}
          placeholder="1500.00"
          aria-invalid={Boolean(errores.sueldo_mensual)}
          className="w-full bg-transparent text-center text-[52px] font-extrabold tracking-tight tabular-nums outline-none cifra-campo placeholder:text-texto-2/40"
        />
        <MensajeError texto={errores.sueldo_mensual} />
        {estado.aviso && (
          <p role="alert" className="text-center text-[15px] font-medium leading-snug text-naranja">
            <ConMontos texto={estado.aviso} />
          </p>
        )}
      </div>

      <div className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
        <label className="flex items-center justify-between gap-4 py-3.5">
          <span className="text-[17px]">Moneda</span>
          <select name="moneda_base" defaultValue={v?.moneda_base ?? moneda}className="bg-transparent text-right text-[17px] text-texto-2 outline-none">
            {MONEDAS.map((m) => (
              <option key={m} value={m}>
                {m} · {nombres[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-4 py-3.5">
          <span className="text-[17px]">Día de pago</span>
          <input
            name="dia_pago"
            inputMode="numeric"
            defaultValue={v?.dia_pago ?? diaPago}
            required
            className="w-16 bg-transparent text-right text-[17px] text-texto-2 outline-none"
          />
        </label>
      </div>
      <MensajeError texto={errores.moneda_base ?? errores.dia_pago ?? estado.error} />
      <p className="px-1 text-[13px] text-texto-2">
        Soles por defecto. Si cambias la moneda, tus montos y metas se convierten con el tipo de cambio de hoy. El día de pago define tu mes: si cobras el 15, va del 15 al 14.
      </p>
      <BotonEnviar texto={textoBoton} clase="bg-azul-relleno text-white" />
    </form>
  );
}
