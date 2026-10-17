import Link from "next/link";
import type { ReactNode } from "react";
import { Anillos } from "@/components/Anillos";
import { Icono } from "@/components/Icono";
import { AvisoInstalar } from "@/components/pwa/AvisoInstalar";
import { Pantalla, Tarjeta } from "@/components/ui";
import type { Consejo } from "@/lib/consejos";
import { formatearDinero, fraccion, type Resumen } from "@/lib/dinero";

export type DatosInicio = {
  fecha: string;
  periodo: string;
  inicial: string;
  moneda: string;
  resumen: Resumen;
  consejo: Consejo | null;
  sinMovimientos: boolean;
  /** Tarjetas adicionales bajo el resumen (por ejemplo, el cierre de mes). */
  extra?: ReactNode;
};

export function VistaInicio({ fecha, periodo, inicial, moneda, resumen: r, consejo, sinMovimientos, extra }: DatosInicio) {
  const dinero = (n: number) => formatearDinero(n, moneda);
  const partes = [
    { nombre: "Gastos", monto: r.gastos, texto: "text-rojo", anillo: "text-rojo-relleno" },
    { nombre: "Ahorros", monto: r.ahorros, texto: "text-verde", anillo: "text-verde-relleno" },
    { nombre: "Para mí", monto: r.paraMi, texto: "text-morado", anillo: "text-morado-relleno" },
  ];
  const pct = (n: number) => Math.round(fraccion(n, r.ingresos) * 100);

  return (
    <Pantalla>
      <header className="flex items-end justify-between pt-2">
        <div>
          <p className="text-[15px] font-semibold text-texto-2">{fecha}</p>
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Inicio</h1>
        </div>
        <Link
          href="/ajustes"
          aria-label="Ajustes"
          className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-heroe-desde to-heroe-hasta text-[20px] font-bold text-white"
        >
          {inicial}
        </Link>
      </header>

      <AvisoInstalar />

      <section className="rounded-[28px] bg-gradient-to-br from-heroe-desde to-heroe-hasta p-6 text-white shadow-[0_12px_30px_rgb(0_98_209/0.28)]">
        <p className="text-[15px] font-semibold text-white/85">Sin asignar</p>
        <p className="text-[44px] font-extrabold leading-tight tracking-tight tabular-nums">{dinero(r.sinAsignar)}</p>
        <p className="text-[15px] text-white/85">
          de {dinero(r.ingresos)} · {periodo}
        </p>
      </section>

      {extra}

      <Tarjeta className="flex items-center gap-5">
        <Anillos
          etiqueta={`Gastos ${pct(r.gastos)}%, ahorros ${pct(r.ahorros)}% y Para mí ${pct(r.paraMi)}% de tus ingresos`}
          anillos={partes.map((p) => ({ fraccion: fraccion(p.monto, r.ingresos), clase: p.anillo }))}
        />
        <dl className="flex flex-1 flex-col gap-2.5">
          {partes.map((p) => (
            <div key={p.nombre}>
              <dt className="text-[15px] text-texto-2">{p.nombre}</dt>
              <dd className={`text-[17px] font-bold tabular-nums ${p.texto}`}>{dinero(p.monto)}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <Link href="/para-mi" className="flex items-center justify-between rounded-[22px] bg-tarjeta px-5 py-4">
        {r.paraMi > 0 ? (
          <span>
            <span className="block text-[15px] text-texto-2">Para mí · te quedan</span>
            <span className="block text-[20px] font-bold tabular-nums text-morado">{dinero(r.paraMiRestante)}</span>
          </span>
        ) : (
          <span>
            <span className="block text-[15px] text-texto-2">Para mí</span>
            <span className="block text-[17px] font-semibold text-morado">Asigna tu bolsa del mes</span>
          </span>
        )}
        <Icono nombre="atras" className="size-5 rotate-180 text-texto-2" />
      </Link>

      {sinMovimientos ? (
        <Link href="/agregar" className="flex items-start gap-3 rounded-[22px] bg-tinte-morado px-5 py-4">
          <Icono nombre="mas" className="mt-0.5 size-6 shrink-0 text-morado" />
          <p className="text-[16px] leading-snug">
            <span className="font-semibold">Empieza:</span> toca + para registrar tu primer gasto.
          </p>
        </Link>
      ) : (
        consejo && (
          <Link href="/dashboard" className="flex items-start gap-3 rounded-[22px] bg-tinte-morado px-5 py-4">
            <Icono nombre="bombilla" className="mt-0.5 size-6 shrink-0 text-morado" />
            <p className="text-[16px] leading-snug">
              <span className="font-semibold">{consejo.titulo}:</span> {consejo.texto}
            </p>
          </Link>
        )
      )}
    </Pantalla>
  );
}
