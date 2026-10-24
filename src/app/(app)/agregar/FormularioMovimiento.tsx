"use client";

import { useActionState, useState } from "react";
import { guardarMovimiento, type EstadoFormulario } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Alerta, MensajeError } from "@/components/ui";
import { encolarMovimiento } from "@/lib/dispositivo";
import { FUENTE_TIPO_CAMBIO } from "@/lib/tipoCambio";
import { MONEDAS } from "@/lib/validacion";

type Opcion = { id: string; nombre: string };

export type ValoresMovimiento = {
  tipo: string;
  monto: string;
  concepto: string;
  fecha: string;
  moneda: string;
  categoria_id: string;
  meta_id: string;
  deuda_id: string;
  nota: string;
  recurrente: boolean;
};

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

const tipos = [
  { valor: "GASTO", nombre: "Gasto", activo: "bg-rojo text-fondo", punto: "bg-rojo-relleno" },
  { valor: "OCIO", nombre: "Para mí", activo: "bg-morado text-fondo", punto: "bg-morado-relleno" },
  { valor: "AHORRO", nombre: "Ahorro", activo: "bg-verde text-fondo", punto: "bg-verde-relleno" },
  { valor: "INGRESO", nombre: "Ingreso", activo: "bg-azul-relleno text-white", punto: "bg-azul-relleno" },
];

const simbolos: Record<string, string> = { PEN: "S/", USD: "US$", EUR: "€", MXN: "MX$", COP: "COL$", CLP: "CLP$", ARS: "AR$" };

export function FormularioMovimiento(props: {
  categorias: Opcion[];
  metas: Opcion[];
  deudas?: Opcion[];
  hoy: string;
  monedaBase: string;
  inicial?: Partial<ValoresMovimiento>;
  accion?: Accion;
  textoBoton?: string;
}) {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(props.accion ?? guardarMovimiento, {});
  // Tras un error, el servidor devuelve lo escrito: el formulario vuelve a mostrarlo en vez de quedar vacío.
  const enviado = estado.valores;
  const inicial: Partial<ValoresMovimiento> = enviado
    ? { ...props.inicial, ...enviado, recurrente: enviado.recurrente === "on" }
    : (props.inicial ?? {});
  const [tipo, setTipo] = useState(inicial.tipo ?? "GASTO");
  const [moneda, setMoneda] = useState(inicial.moneda ?? props.monedaBase);
  const [encolado, setEncolado] = useState(false);
  const errores = estado.errores ?? {};
  // La bolsa de Para mí solo aparece como opción cuando se edita una.
  const opciones =
    props.inicial?.tipo === "PARA_MI"
      ? [...tipos, { valor: "PARA_MI", nombre: "Bolsa", activo: "bg-morado text-fondo", punto: "bg-morado-relleno" }]
      : tipos;

  // Sin conexión (solo al crear): se guarda en el iPhone y se envía al volver internet.
  function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    if (props.accion || navigator.onLine) return;
    evento.preventDefault();
    if (encolarMovimiento(new FormData(evento.currentTarget))) {
      evento.currentTarget.reset();
      setEncolado(true);
    }
  }

  if (encolado) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[22px] bg-tarjeta px-6 py-8 text-center">
        <p className="text-[20px] font-bold">Guardado en tu teléfono</p>
        <p className="text-[17px] text-texto-2">Sin conexión. Se enviará solo cuando vuelva internet.</p>
        <button type="button" onClick={() => setEncolado(false)} className="text-[17px] font-semibold text-azul">
          Agregar otro
        </button>
      </div>
    );
  }

  return (
    // La clave cambia con cada respuesta con datos: los campos se vuelven a montar con lo enviado.
    <form key={enviado ? JSON.stringify(enviado) : "inicial"} action={accion} onSubmit={alEnviar} className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-2 gap-2.5">
        <legend className="sr-only">Tipo de movimiento</legend>
        {opciones.map((t) => (
          <label
            key={t.valor}
            className={`flex cursor-pointer items-center gap-2.5 rounded-2xl px-4 py-3 text-[17px] font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul ${
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

      <div className="flex flex-col items-center gap-3">
        <label htmlFor="monto" className="sr-only">
          Monto
        </label>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-[32px] font-semibold text-texto-2">{simbolos[moneda] ?? moneda}</span>
          <input
            id="monto"
            name="monto"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            required
            defaultValue={inicial.monto}
            aria-invalid={Boolean(errores.monto)}
            className="w-56 bg-transparent text-center text-[64px] font-extrabold tracking-tight tabular-nums outline-none placeholder:text-texto-2/40"
          />
        </div>
        <label className="flex items-center gap-2 rounded-full bg-control px-4 py-1.5">
          <span className="sr-only">Moneda</span>
          <select
            name="moneda"
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className="bg-transparent text-[15px] font-bold outline-none"
          >
            {MONEDAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {moneda !== props.monedaBase && (
          <p className="px-4 text-center text-[13px] text-texto-2">
            Se convierte a {props.monedaBase} con el tipo de cambio de hoy y queda guardado así. Fuente:{" "}
            <a href={FUENTE_TIPO_CAMBIO.url} target="_blank" rel="noopener noreferrer" className="underline">
              {FUENTE_TIPO_CAMBIO.nombre}
            </a>
            .
          </p>
        )}
        <MensajeError texto={errores.monto ?? errores.moneda} />
      </div>

      {estado.bloqueo && <Alerta texto={estado.bloqueo} />}

      <div className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
        <label className="flex items-center justify-between gap-4 py-3.5">
          <span className="text-[17px]">Concepto</span>
          <input
            name="concepto"
            maxLength={80}
            required
            defaultValue={inicial.concepto}
            placeholder="Ej. Spotify"
            className="min-w-0 flex-1 bg-transparent text-right text-[17px] text-texto-2 outline-none"
          />
        </label>
        {tipo === "AHORRO" ? (
          <label className="flex items-center justify-between gap-4 py-3.5">
            <span className="text-[17px]">Meta</span>
            <select name="meta_id" defaultValue={inicial.meta_id ?? ""} className="bg-transparent text-right text-[17px] text-texto-2 outline-none">
              <option value="">Elige una meta</option>
              {props.metas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex items-center justify-between gap-4 py-3.5">
            <span className="text-[17px]">Categoría</span>
            <select
              name="categoria_id"
              defaultValue={inicial.categoria_id ?? ""}
              className="bg-transparent text-right text-[17px] text-texto-2 outline-none"
            >
              <option value="">Sin categoría</option>
              {props.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        {tipo === "GASTO" && (props.deudas?.length ?? 0) > 0 && (
          <label className="flex items-center justify-between gap-4 py-3.5">
            <span className="text-[17px]">Pago de deuda</span>
            <select
              name="deuda_id"
              defaultValue={inicial.deuda_id ?? ""}
              className="bg-transparent text-right text-[17px] text-texto-2 outline-none"
            >
              <option value="">Ninguna</option>
              {props.deudas?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
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
            defaultValue={inicial.fecha ?? props.hoy}
            max={props.hoy}
            required
            className="bg-transparent text-right text-[17px] text-texto-2 outline-none"
          />
        </label>
        <label className="flex items-center justify-between gap-4 py-3.5">
          <span className="text-[17px]">Nota</span>
          <input
            name="nota"
            maxLength={280}
            defaultValue={inicial.nota}
            placeholder="Opcional"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-right text-[17px] text-texto-2 outline-none"
          />
        </label>
        <label className="flex items-center justify-between gap-4 py-3">
          <span className="text-[17px]">Se repite cada mes</span>
          <input type="checkbox" name="recurrente" defaultChecked={inicial.recurrente} className="peer sr-only" />
          <span
            aria-hidden="true"
            className="flex h-[31px] w-[51px] items-center rounded-full bg-control p-0.5 transition peer-checked:justify-end peer-checked:bg-verde-relleno peer-focus-visible:ring-2 peer-focus-visible:ring-azul"
          >
            <span className="size-[27px] rounded-full bg-white shadow" />
          </span>
        </label>
      </div>

      <MensajeError texto={errores.concepto ?? errores.meta_id ?? errores.deuda_id ?? errores.nota ?? errores.fecha ?? errores.tipo ?? estado.error} />
      {tipo === "AHORRO" && props.metas.length === 0 && (
        <p className="text-[15px] text-texto-2">Primero crea una meta en la pestaña Ahorros.</p>
      )}

      <BotonEnviar texto={props.textoBoton ?? "Guardar"} />
    </form>
  );
}
