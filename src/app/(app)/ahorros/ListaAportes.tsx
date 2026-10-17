import Link from "next/link";
import { eliminarMovimiento } from "@/app/acciones";
import { Icono } from "@/components/Icono";
import type { Aporte } from "@/lib/datos/repositorio";
import { formatearDinero } from "@/lib/dinero";
import { fechaCorta } from "@/lib/fechas";

/** Últimos aportes. Tocar uno muestra sus acciones (editar o eliminar), como en las listas de iOS. */
export function ListaAportes({ aportes }: { aportes: Aporte[] }) {
  if (aportes.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-texto-2">Aportes recientes</h2>
        <Link href="/historial?tipo=AHORRO" className="text-[15px] text-azul">
          Ver todos
        </Link>
      </div>
      <ul className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
        {aportes.map((a) => (
          <li key={a.id}>
            <details className="group py-3">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px]">{a.concepto}</span>
                  <span className="block truncate text-[13px] text-texto-2">
                    {a.meta?.nombre ?? "Sin meta"} · {fechaCorta(a.fecha)}
                  </span>
                </span>
                <span className="shrink-0 text-[17px] font-semibold text-verde tabular-nums">
                  {formatearDinero(a.monto, a.moneda)}
                </span>
                <Icono nombre="atras" className="size-4 shrink-0 -rotate-90 text-texto-2 transition group-open:rotate-90" />
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href={`/historial/${a.id}`}
                  className="rounded-[14px] bg-fondo py-2.5 text-center text-[15px] font-semibold text-azul"
                >
                  Editar
                </Link>
                <form action={eliminarMovimiento.bind(null, a.id, "/ahorros")}>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-rojo py-2.5 text-[15px] font-semibold text-fondo"
                  >
                    <Icono nombre="basura" className="size-4" />
                    Eliminar aporte
                  </button>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
