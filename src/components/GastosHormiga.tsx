import { Monto } from "@/components/Monto";
import { formatearDinero } from "@/lib/dinero";
import type { GastoHormiga } from "@/lib/ideas";

/** Gastos chicos que se repiten en el periodo y cuánto suman (Dashboard › Mes). */
export function GastosHormiga({
  total,
  umbral,
  grupos,
  moneda,
}: {
  total: number;
  umbral: number;
  grupos: GastoHormiga[];
  moneda: string;
}) {
  const dinero = (n: number) => formatearDinero(n, moneda);
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <div>
        <h2 className="text-[17px] font-semibold">Gastos hormiga</h2>
        <p className="text-[13px] leading-snug text-texto-2">
          Gastos de hasta <Monto texto={dinero(umbral)} /> que repetiste 3 veces o más este periodo. Juntos suman{" "}
          <b className="text-texto">
            <Monto texto={dinero(total)} />
          </b>
          .
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {grupos.map((g) => (
          <li key={g.concepto} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-[17px]">{g.concepto}</span>
            <span className="text-[13px] text-texto-2">{g.veces} veces</span>
            <span className="w-24 text-right text-[17px] font-semibold tabular-nums">
              <Monto texto={dinero(g.total)} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
