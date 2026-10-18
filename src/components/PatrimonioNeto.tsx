import { Monto } from "@/components/Monto";
import { Tarjeta } from "@/components/ui";
import { formatearDinero } from "@/lib/dinero";
import type { PuntoPatrimonio } from "@/lib/ideas";

const ANCHO = 320;
const ALTO = 120;

/**
 * Patrimonio neto mes a mes (ahorros + te deben − deudas) en una línea simple. Si en algún mes
 * fue negativo, se marca la línea del cero para que se vea cuándo se cruzó.
 */
export function PatrimonioNeto({ puntos, etiquetas, moneda }: { puntos: PuntoPatrimonio[]; etiquetas: string[]; moneda: string }) {
  const dinero = (n: number) => formatearDinero(n, moneda);
  const actual = puntos.at(-1);
  if (!actual) return null;

  const valores = puntos.map((p) => p.neto);
  const min = Math.min(0, ...valores);
  const max = Math.max(1, ...valores);
  const x = (i: number) => (puntos.length === 1 ? ANCHO / 2 : (i / (puntos.length - 1)) * ANCHO);
  const y = (v: number) => ALTO - ((v - min) / (max - min)) * ALTO;
  const linea = valores.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const subio = valores.length > 1 && actual.neto >= (valores[0] ?? 0);

  return (
    <Tarjeta className="flex flex-col gap-3">
      <div>
        <p className="text-[15px] text-texto-2">Patrimonio neto</p>
        <p className={`text-[34px] font-extrabold leading-tight tracking-tight tabular-nums ${actual.neto < 0 ? "text-rojo" : ""}`}>
          <Monto texto={dinero(actual.neto)} />
        </p>
        <p className="text-[13px] leading-snug text-texto-2">
          Ahorros <Monto texto={dinero(actual.ahorros)} /> + te deben <Monto texto={dinero(actual.teDeben)} /> − deudas{" "}
          <Monto texto={dinero(actual.deudas)} />
        </p>
      </div>
      <svg
        viewBox={`-4 -4 ${ANCHO + 8} ${ALTO + 8}`}
        className={`h-32 w-full overflow-visible ${subio ? "text-verde-relleno" : "text-rojo-relleno"}`}
        role="img"
        aria-label={`Patrimonio neto de los últimos meses. Hoy: ${dinero(actual.neto)}`}
      >
        {min < 0 && (
          <line x1="0" x2={ANCHO} y1={y(0)} y2={y(0)} className="stroke-linea" strokeWidth="1.5" strokeDasharray="4 4" />
        )}
        <path d={linea} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(valores.length - 1)} cy={y(actual.neto)} r="5" fill="currentColor" />
      </svg>
      <div className="flex justify-between text-[11px] text-texto-2">
        <span>{etiquetas[0]}</span>
        <span>{etiquetas.at(-1)}</span>
      </div>
    </Tarjeta>
  );
}
