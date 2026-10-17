import Link from "next/link";
import { Barra } from "@/components/Anillos";
import { Dona } from "@/components/Dona";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Encabezado, Pantalla, Tarjeta } from "@/components/ui";
import { CLASES_COLOR } from "@/lib/colores";
import type { Consejo } from "@/lib/consejos";
import type { GastoCategoria } from "@/lib/datos/repositorio";
import { formatearDinero, fraccion, type Resumen } from "@/lib/dinero";

export type MesGrafico = { etiqueta: string; gastos: number; ahorros: number };

export type DatosDashboard = {
  vista: "mes" | "anio";
  moneda: string;
  etiquetaPeriodo: string;
  categorias: GastoCategoria[];
  resumen: Resumen;
  consejos: Consejo[];
  meses: MesGrafico[];
};

const iconoConsejo: Record<Consejo["color"], { icono: NombreIcono; fondo: string }> = {
  rojo: { icono: "alerta", fondo: "bg-rojo" },
  verde: { icono: "ahorros", fondo: "bg-verde" },
  morado: { icono: "check", fondo: "bg-morado" },
  azul: { icono: "bombilla", fondo: "bg-azul-relleno" },
};

export function VistaDashboard(d: DatosDashboard) {
  const dinero = (n: number) => formatearDinero(n, d.moneda);

  return (
    <Pantalla>
      <Encabezado titulo="Dashboard" subtitulo={d.vista === "mes" ? d.etiquetaPeriodo : "Últimos 12 meses"} />

      <nav aria-label="Vista" className="flex rounded-[14px] bg-control p-1">
        {(
          [
            { valor: "mes", nombre: "Mes", href: "/dashboard" },
            { valor: "anio", nombre: "Año", href: "/dashboard?vista=anio" },
          ] as const
        ).map((v) => (
          <Link
            key={v.valor}
            href={v.href}
            aria-current={d.vista === v.valor ? "page" : undefined}
            className={`flex-1 rounded-[10px] py-1.5 text-center text-[15px] font-semibold ${
              d.vista === v.valor ? "bg-tarjeta shadow-sm" : "text-texto-2"
            }`}
          >
            {v.nombre}
          </Link>
        ))}
      </nav>

      {d.vista === "mes" ? <VistaMes {...d} dinero={dinero} /> : <VistaAnio meses={d.meses} dinero={dinero} />}

      {d.consejos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-texto-2">Para ti</h2>
          {d.consejos.map((c) => (
            <div key={c.id} className="flex items-start gap-3.5 rounded-[22px] bg-tarjeta p-4">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-white ${iconoConsejo[c.color].fondo}`}>
                <Icono nombre={iconoConsejo[c.color].icono} className="size-6" />
              </span>
              <span>
                <span className="block text-[17px] font-bold">{c.titulo}</span>
                <span className="block text-[15px] leading-snug text-texto-2">{c.texto}</span>
              </span>
            </div>
          ))}
        </section>
      )}
    </Pantalla>
  );
}

function VistaMes({ categorias, resumen: r, dinero }: DatosDashboard & { dinero: (n: number) => string }) {
  const total = categorias.reduce((s, c) => s + c.total, 0);
  const totales = [
    { nombre: "Ingresos", monto: r.ingresos, clase: "text-azul" },
    { nombre: "Gastos", monto: r.gastos, clase: "text-rojo" },
    { nombre: "Ahorros", monto: r.ahorros, clase: "text-verde" },
    { nombre: "Para mí", monto: r.ocio, clase: "text-morado" },
  ];

  return (
    <>
      <Tarjeta className="flex flex-col items-center gap-5">
        <Dona
          etiqueta={`Gastos por categoría: ${categorias
            .map((c) => `${c.nombre} ${Math.round(fraccion(c.total, total) * 100)}%`)
            .join(", ") || "sin gastos"}`}
          segmentos={categorias.map((c) => ({ valor: c.total, clase: CLASES_COLOR[c.color].trazo }))}
        >
          <span>
            <span className="block text-[15px] text-texto-2">Gastado</span>
            <span className="block text-[26px] font-extrabold tracking-tight tabular-nums">{dinero(total)}</span>
          </span>
        </Dona>
        {categorias.length === 0 ? (
          <p className="text-center text-[15px] text-texto-2">Aún no hay gastos en este periodo.</p>
        ) : (
          <ul className="flex w-full flex-col gap-2.5">
            {categorias.map((c) => {
              const usoTope = c.tope ? c.total / c.tope : null;
              return (
                <li key={c.nombre} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className={`size-3.5 shrink-0 rounded-full ${CLASES_COLOR[c.color].punto}`} aria-hidden="true" />
                    <span className="flex-1 truncate text-[17px]">{c.nombre}</span>
                    <span className="text-[15px] tabular-nums text-texto-2">{Math.round(fraccion(c.total, total) * 100)}%</span>
                    <span className="w-28 text-right text-[17px] font-semibold tabular-nums">{dinero(c.total)}</span>
                  </div>
                  {usoTope !== null && c.tope && (
                    <div className="flex flex-col gap-1 pl-6">
                      <Barra
                        fraccion={usoTope}
                        clase={usoTope >= 1 ? "text-rojo-relleno" : usoTope >= 0.8 ? "text-morado-relleno" : "text-verde-relleno"}
                      />
                      <span className={`text-[13px] ${usoTope >= 1 ? "font-semibold text-rojo" : "text-texto-2"}`}>
                        {Math.round(usoTope * 100)}% de tu tope de {dinero(c.tope)}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/categorias" className="text-[15px] font-semibold text-azul">
          Ajustar topes por categoría ›
        </Link>
      </Tarjeta>

      <div className="grid grid-cols-2 gap-3">
        {totales.map((t) => (
          <div key={t.nombre} className="rounded-[20px] bg-tarjeta px-4 py-3">
            <p className="text-[13px] text-texto-2">{t.nombre}</p>
            <p className={`text-[19px] font-bold tabular-nums ${t.clase}`}>{dinero(t.monto)}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function VistaAnio({ meses, dinero }: { meses: MesGrafico[]; dinero: (n: number) => string }) {
  const maximo = Math.max(1, ...meses.map((m) => Math.max(m.gastos, m.ahorros)));
  const conGastos = meses.filter((m) => m.gastos > 0);
  const promedio = conGastos.length ? conGastos.reduce((s, m) => s + m.gastos, 0) / conGastos.length : 0;
  const ahorrado = meses.reduce((s, m) => s + m.ahorros, 0);
  const mayor = conGastos.reduce<MesGrafico | null>((a, m) => (!a || m.gastos > a.gastos ? m : a), null);

  return (
    <>
      <Tarjeta className="flex flex-col gap-4">
        <div className="flex gap-4 text-[13px] text-texto-2">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rojo-relleno" aria-hidden="true" /> Gastos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-verde-relleno" aria-hidden="true" /> Ahorros
          </span>
        </div>
        <div
          className="flex h-44 items-end justify-between gap-1"
          role="img"
          aria-label={meses.map((m) => `${m.etiqueta}: gastos ${dinero(m.gastos)}, ahorros ${dinero(m.ahorros)}`).join("; ")}
        >
          {meses.map((m) => (
            <div key={m.etiqueta} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <span className="w-1/2 rounded-t-[4px] bg-rojo-relleno" style={{ height: `${(m.gastos / maximo) * 100}%` }} />
                <span className="w-1/2 rounded-t-[4px] bg-verde-relleno" style={{ height: `${(m.ahorros / maximo) * 100}%` }} />
              </div>
              <span className="text-[11px] text-texto-2">{m.etiqueta}</span>
            </div>
          ))}
        </div>
      </Tarjeta>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[20px] bg-tarjeta px-4 py-3">
          <p className="text-[13px] text-texto-2">Gasto promedio al mes</p>
          <p className="text-[19px] font-bold tabular-nums text-rojo">{dinero(promedio)}</p>
        </div>
        <div className="rounded-[20px] bg-tarjeta px-4 py-3">
          <p className="text-[13px] text-texto-2">Ahorrado en 12 meses</p>
          <p className="text-[19px] font-bold tabular-nums text-verde">{dinero(ahorrado)}</p>
        </div>
      </div>
      {mayor && (
        <p className="px-1 text-[15px] text-texto-2">
          Tu mes con más gastos fue <span className="font-semibold text-texto">{mayor.etiqueta}</span>, con {dinero(mayor.gastos)}.
        </p>
      )}
    </>
  );
}
