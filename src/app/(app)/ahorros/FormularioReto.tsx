import { crearReto } from "@/app/acciones";
import { BotonEnviar } from "@/components/BotonEnviar";
import { formatearDinero } from "@/lib/dinero";
import { objetivoReto } from "@/lib/ideas";
import { Monto } from "@/components/Monto";

const BASES = [1, 2, 5, 10];

/** Reto de 52 semanas: la semana 1 aportas 1 × base, la 2 aportas 2 × base… hasta la 52. */
export function FormularioReto({ moneda }: { moneda: string }) {
  return (
    <details className="rounded-[22px] bg-tinte-morado p-1">
      <summary className="cursor-pointer list-none px-4 py-3 text-center text-[17px] font-semibold text-morado">
        Reto de 52 semanas
      </summary>
      <form action={crearReto} className="flex flex-col gap-3 px-3 pb-3">
        <p className="text-[15px] leading-snug">
          Cada semana aportas un poco más: la semana 1 pones el monto base, la semana 2 el doble, y así hasta la 52. Elige
          cuánto quieres juntar en un año:
        </p>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">Monto base</legend>
          {BASES.map((b, i) => (
            <label
              key={b}
              className="flex cursor-pointer flex-col rounded-2xl bg-tarjeta px-3 py-2.5 has-[:checked]:ring-2 has-[:checked]:ring-morado"
            >
              <input type="radio" name="base" value={b} defaultChecked={i === 1} className="sr-only" />
              <span className="text-[17px] font-bold tabular-nums"><Monto texto={formatearDinero(objetivoReto(b), moneda)} /></span>
              <span className="text-[13px] text-texto-2 tabular-nums">desde <Monto texto={formatearDinero(b, moneda)} /> por semana</span>
            </label>
          ))}
        </fieldset>
        <BotonEnviar texto="Empezar el reto" textoEnviando="Creando…" clase="bg-morado text-fondo" />
      </form>
    </details>
  );
}
