import Link from "next/link";
import { Icono } from "@/components/Icono";
import { Encabezado, Pantalla } from "@/components/ui";
import { CLASES_COLOR, COLOR_TIPO, NOMBRE_TIPO, SIGNO_TIPO } from "@/lib/colores";
import type { FilaHistorial } from "@/lib/datos/repositorio";
import { formatearDinero } from "@/lib/dinero";
import { etiquetaRango, fechaDiaSemana } from "@/lib/fechas";
import { paginasVisibles, TIPOS, totalPaginas, urlHistorial, type Filtros } from "@/lib/filtros";
import type { TipoMovimiento } from "@/lib/supabase/tipos";

type Rango = { desde: string; hasta: string };

export type DatosHistorial = {
  filtros: Filtros;
  filas: FilaHistorial[];
  cantidad: number;
  totales: Record<TipoMovimiento, number>;
  categorias: { id: string; nombre: string }[];
  rangos: { periodo: Rango; anterior: Rango; tresPeriodos: Rango };
  moneda: string;
  hoy: string;
};

function agruparPorFecha(filas: FilaHistorial[]) {
  const grupos = new Map<string, FilaHistorial[]>();
  for (const f of filas) grupos.set(f.fecha, [...(grupos.get(f.fecha) ?? []), f]);
  return [...grupos.entries()];
}

export function VistaHistorial({ filtros, filas, cantidad, totales, categorias, rangos, moneda, hoy }: DatosHistorial) {
  const dinero = (n: number, m = moneda) => formatearDinero(n, m);
  const paginas = totalPaginas(cantidad);
  const gastado = totales.GASTO + totales.OCIO;
  const hayFiltrosExtra = Boolean(filtros.tipo || filtros.categoria || filtros.q);
  const atajos = [
    { nombre: "Este periodo", rango: rangos.periodo },
    { nombre: "Anterior", rango: rangos.anterior },
    { nombre: "3 periodos", rango: rangos.tresPeriodos },
  ];

  return (
    <Pantalla>
      <Encabezado titulo="Historial" subtitulo={etiquetaRango(filtros.desde, filtros.hasta)} />

      <nav aria-label="Rangos rápidos" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {atajos.map((a) => {
          const activo = a.rango.desde === filtros.desde && a.rango.hasta === filtros.hasta;
          return (
            <Link
              key={a.nombre}
              href={urlHistorial({ ...filtros, ...a.rango, pagina: 1 })}
              aria-current={activo ? "true" : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold ${
                activo ? "bg-azul-relleno text-white" : "bg-tarjeta"
              }`}
            >
              {a.nombre}
            </Link>
          );
        })}
      </nav>

      <details className="rounded-[22px] bg-tarjeta" open={hayFiltrosExtra}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[17px] font-semibold">
          <span className="flex items-center gap-2">
            <Icono nombre="ajustes" className="size-5 text-azul" />
            Filtros
          </span>
          {hayFiltrosExtra && <span className="rounded-full bg-azul-relleno/15 px-2.5 py-0.5 text-[13px] text-azul">Activos</span>}
        </summary>
        <form method="get" action="/historial" className="flex flex-col gap-3 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 rounded-2xl bg-fondo px-3 py-2">
              <span className="text-[13px] text-texto-2">Desde</span>
              <input type="date" name="desde" defaultValue={filtros.desde} max={hoy} className="bg-transparent outline-none" />
            </label>
            <label className="flex flex-col gap-1 rounded-2xl bg-fondo px-3 py-2">
              <span className="text-[13px] text-texto-2">Hasta</span>
              <input type="date" name="hasta" defaultValue={filtros.hasta} className="bg-transparent outline-none" />
            </label>
          </div>
          <label className="flex items-center justify-between rounded-2xl bg-fondo px-4 py-3">
            <span className="text-[17px]">Tipo</span>
            <select name="tipo" defaultValue={filtros.tipo ?? ""} className="bg-transparent text-right text-texto-2 outline-none">
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between rounded-2xl bg-fondo px-4 py-3">
            <span className="text-[17px]">Categoría</span>
            <select name="categoria" defaultValue={filtros.categoria ?? ""} className="bg-transparent text-right text-texto-2 outline-none">
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            name="q"
            defaultValue={filtros.q ?? ""}
            maxLength={40}
            placeholder="Buscar por concepto"
            aria-label="Buscar por concepto"
            className="rounded-2xl bg-fondo px-4 py-3 outline-none"
          />
          <div className="flex gap-3">
            <button type="submit" className="flex-1 rounded-[18px] bg-azul-relleno py-3 text-[17px] font-bold text-white">
              Aplicar
            </button>
            <Link href="/historial" className="rounded-[18px] bg-fondo px-5 py-3 text-[17px] font-semibold text-azul">
              Limpiar
            </Link>
          </div>
        </form>
      </details>

      <div className="flex items-baseline justify-between px-1">
        <p className="text-[15px] text-texto-2">
          {cantidad} {cantidad === 1 ? "movimiento" : "movimientos"}
        </p>
        {gastado > 0 && <p className="text-[15px] font-bold tabular-nums text-rojo">−{dinero(gastado)} gastado</p>}
      </div>

      {filas.length === 0 ? (
        <p className="rounded-[22px] bg-tarjeta px-5 py-8 text-center text-[17px] text-texto-2">
          No hay movimientos con estos filtros.
        </p>
      ) : (
        agruparPorFecha(filas).map(([fecha, grupo]) => (
          <section key={fecha} className="flex flex-col gap-2">
            <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-texto-2">
              {fecha === hoy ? `Hoy · ${fechaDiaSemana(fecha)}` : fechaDiaSemana(fecha)}
            </h2>
            <ul className="divide-y divide-linea overflow-hidden rounded-[22px] bg-tarjeta">
              {grupo.map((m) => {
                const color = CLASES_COLOR[m.categoria?.color ?? COLOR_TIPO[m.tipo]];
                const colorMonto = m.tipo === "INGRESO" ? "text-azul" : m.tipo === "AHORRO" ? "text-verde" : "";
                const etiqueta = m.categoria?.nombre ?? NOMBRE_TIPO[m.tipo];
                return (
                  <li key={m.id}>
                    <Link href={`/historial/${m.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-control">
                      <span
                        aria-hidden="true"
                        className={`grid size-10 shrink-0 place-items-center rounded-full text-[17px] font-bold ${color.suave} ${color.texto}`}
                      >
                        {etiqueta.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-semibold">{m.concepto}</span>
                        <span className="block truncate text-[15px] text-texto-2">
                          {etiqueta}
                          {m.recurrente ? " · cada mes" : ""}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className={`block text-[17px] font-semibold tabular-nums ${colorMonto}`}>
                          {SIGNO_TIPO[m.tipo]}
                          {dinero(m.monto_base ?? m.monto)}
                        </span>
                        {m.moneda !== moneda && (
                          <span className="block text-[13px] tabular-nums text-texto-2">{dinero(m.monto, m.moneda)}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {paginas > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-center gap-2 pt-2">
          <EnlacePagina destino={filtros.pagina > 1 ? urlHistorial({ ...filtros, pagina: filtros.pagina - 1 }) : null} texto="‹" etiqueta="Página anterior" />
          {paginasVisibles(filtros.pagina, paginas).map((n) => (
            <Link
              key={n}
              href={urlHistorial({ ...filtros, pagina: n })}
              aria-current={n === filtros.pagina ? "page" : undefined}
              className={`grid size-11 place-items-center rounded-full text-[17px] font-semibold tabular-nums ${
                n === filtros.pagina ? "bg-azul-relleno text-white" : "bg-tarjeta"
              }`}
            >
              {n}
            </Link>
          ))}
          <EnlacePagina
            destino={filtros.pagina < paginas ? urlHistorial({ ...filtros, pagina: filtros.pagina + 1 }) : null}
            texto="›"
            etiqueta="Página siguiente"
          />
        </nav>
      )}
    </Pantalla>
  );
}

function EnlacePagina({ destino, texto, etiqueta }: { destino: string | null; texto: string; etiqueta: string }) {
  const clase = "grid size-11 place-items-center rounded-full text-[22px] font-semibold";
  return destino ? (
    <Link href={destino} aria-label={etiqueta} className={`${clase} bg-tarjeta text-azul`}>
      {texto}
    </Link>
  ) : (
    <span aria-hidden="true" className={`${clase} bg-control text-texto-2`}>
      {texto}
    </span>
  );
}
