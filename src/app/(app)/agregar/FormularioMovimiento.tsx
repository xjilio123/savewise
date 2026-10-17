"use client";

import { useActionState, useState } from "react";
import { guardarMovimiento, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { MensajeError } from "@/components/ui";

type Opcion = { id: string; nombre: string };

const tipos = [
  { valor: "GASTO", nombre: "Gasto", activo: "bg-rojo text-white", punto: "bg-rojo-relleno" },
  { valor: "OCIO", nombre: "Para mí", activo: "bg-morado text-white", punto: "bg-morado-relleno" },
  { valor: "AHORRO", nombre: "Ahorro", activo: "bg-verde text-white", punto: "bg-verde-relleno" },
  { valor: "INGRESO", nombre: "Ingreso", activo: "bg-azul-relleno text-white", punto: "bg-azul-relleno" },
];

const simbolos: Record<string, string> = { PEN: "S/", USD: "US$", EUR: "€", MXN: "MX$", COP: "COL$", CLP: "CLP$", ARS: "AR$" };

export function FormularioMovimiento(props: {
  categorias: Opcion[];
  metas: Opcion[];
  hoy: string;
  moneda: string;
  tipoInicial: string;
  metaInicial: string;
}) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(guardarMovimiento, {});
  const [tipo, setTipo] = useState(props.tipoInicial);
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-2 gap-2.5">
        <legend className="sr-only">Tipo de movimiento</legend>
        {tipos.map((t) => (
          <label
            key={t.valor}
            className={`flex cursor-pointer items-center gap-2.5 rounded-2xl px-4 py-3 text-[17px] font-semibold transition ${
              tipo === t.valor ? t.activo : "bg-tarjeta"
            }`}
          >
            <input
              type="radio"
              name="tipo"
              value={t.valor}
              checked={tipo === t.valor}
              onChange={() => setTipo(t.valor)}
              className="sr-only"
            />
            <span className={`size-3 rounded-full ${tipo === t.valor ? "bg-white" : t.punto}`} aria-hidden="true" />
            {t.nombre}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col items-center gap-2">
        <label htmlFor="monto" className="sr-only">
          Monto
        </label>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-[32px] font-semibold text-texto-2">{simbolos[props.moneda] ?? props.moneda}</span>
          <input
            id="monto"
            name="monto"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            required
            aria-invalid={Boolean(errores.monto)}
            className="w-56 bg-transparent text-center text-[64px] font-extrabold tracking-tight tabular-nums outline-none placeholder:text-texto-2/40"
          />
        </div>
        <MensajeError texto={errores.monto} />
      </div>

      <div className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
        <label className="flex items-center justify-between gap-4 py-3.5">
          <span className="text-[17px]">Concepto</span>
          <input
            name="concepto"
            maxLength={80}
            required
            placeholder="Ej. Spotify"
            className="min-w-0 flex-1 bg-transparent text-right text-[17px] text-texto-2 outline-none"
          />
        </label>
        {tipo !== "AHORRO" && (
          <label className="flex items-center justify-between gap-4 py-3.5">
            <span className="text-[17px]">Categoría</span>
            <select name="categoria_id" defaultValue="" className="bg-transparent text-right text-[17px] text-texto-2 outline-none">
              <option value="">Sin categoría</option>
              {props.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        {tipo === "AHORRO" && (
          <label className="flex items-center justify-between gap-4 py-3.5">
            <span className="text-[17px]">Meta</span>
            <select
              name="meta_id"
              defaultValue={props.metaInicial}
              className="bg-transparent text-right text-[17px] text-texto-2 outline-none"
            >
              <option value="">Elige una meta</option>
              {props.metas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center justify-between gap-4 py-3.5">
          <span className="text-[17px]">Fecha</span>
          <input
            type="date"
            name="fecha"
            defaultValue={props.hoy}
            max={props.hoy}
            required
            className="bg-transparent text-right text-[17px] text-texto-2 outline-none"
          />
        </label>
        <label className="flex items-center justify-between gap-4 py-3">
          <span className="text-[17px]">Se repite cada mes</span>
          <input type="checkbox" name="recurrente" className="peer sr-only" />
          <span
            aria-hidden="true"
            className="flex h-[31px] w-[51px] items-center rounded-full bg-control p-0.5 transition peer-checked:justify-end peer-checked:bg-verde-relleno peer-focus-visible:ring-2 peer-focus-visible:ring-azul"
          >
            <span className="size-[27px] rounded-full bg-white shadow" />
          </span>
        </label>
      </div>

      <MensajeError texto={errores.concepto ?? errores.meta_id ?? errores.fecha ?? errores.tipo ?? estado.error} />
      {tipo === "AHORRO" && props.metas.length === 0 && (
        <p className="text-[15px] text-texto-2">Primero crea una meta en la pestaña Ahorros.</p>
      )}

      <BotonEnviar texto="Guardar" />
    </form>
  );
}
