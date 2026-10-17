import Link from "next/link";
import { crearMetaEmergencia } from "@/app/acciones";
import { AnilloProgreso } from "@/components/Anillos";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Encabezado, Pantalla, Tarjeta } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { cuotaMensual, formatearDinero, fraccion } from "@/lib/dinero";
import { hoyLima } from "@/lib/fechas";
import { proyectarMeta, sugerirFondoEmergencia } from "@/lib/planificacion";
import { requerirSesion } from "@/lib/supabase/servidor";
import { semanaDelReto } from "@/lib/ideas";
import { FormularioMeta } from "./FormularioMeta";
import { FormularioReto } from "./FormularioReto";
import { ListaAportes } from "./ListaAportes";
import { ConMontos, Monto } from "@/components/Monto";

/** Fecha (AAAA-MM-DD) en Lima de un timestamp: el día en que empezó el reto. */
const fechaLima = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date(ts));

const nombreMes = new Intl.DateTimeFormat("es-PE", { month: "short", year: "numeric", timeZone: "UTC" });
const etiquetaMes = (aaaamm: string) => nombreMes.format(new Date(`${aaaamm}-15T12:00:00Z`)).replace(".", "");

/** Inicio (AAAA-MM-01) de los últimos 3 meses calendario, incluido el actual. */
function ultimos3Meses(hoy: string): string[] {
  const [a, m] = hoy.split("-").map(Number) as [number, number];
  return [2, 1, 0].map((atras) => new Date(Date.UTC(a, m - 1 - atras, 1)).toISOString().slice(0, 10));
}

export default async function Ahorros() {
  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const hoy = hoyLima();
  const meses = ultimos3Meses(hoy);
  const [perfil, metas, aportes, totales, recientes] = await Promise.all([
    repo.perfil(),
    repo.metas(),
    repo.aportesDesde(meses[0]!),
    repo.totalesPorMes(meses[0]!, meses[2]!),
    repo.aportesRecientes(8),
  ]);
  const dinero = (n: number) => formatearDinero(n, perfil.moneda_base);
  const total = metas.reduce((suma, m) => suma + Math.round(m.ahorrado * 100), 0) / 100;

  // Ritmo de aporte de cada meta en los últimos 3 meses.
  const aportesDe = (metaId: string) =>
    meses.map((mes) =>
      aportes
        .filter((a) => a.meta_id === metaId && a.fecha.slice(0, 7) === mes.slice(0, 7))
        .reduce((s, a) => s + (a.monto_base ?? 0), 0),
    );
  const proyecciones = new Map(
    metas.map((m) => [
      m.id,
      proyectarMeta({
        ahorrado: m.ahorrado,
        objetivo: m.objetivo,
        aportesUltimosMeses: aportesDe(m.id),
        hoy,
        fechaObjetivo: m.fecha_objetivo,
      }),
    ]),
  );
  const totalAlCierre = metas.reduce((s, m) => s + Math.round((proyecciones.get(m.id)?.alCierreDelAnio ?? 0) * 100), 0) / 100;

  const fondo = sugerirFondoEmergencia(
    meses.map((mes) => totales.filter((t) => t.mes === mes && t.tipo === "GASTO").reduce((s, t) => s + t.total, 0)),
  );
  const metaEmergencia = metas.find((m) => /emergencia/i.test(m.nombre));

  return (
    <Pantalla>
      <Encabezado
        titulo="Ahorros"
        subtitulo={metas.length === 1 ? "1 meta activa" : `${metas.length} metas activas`}
        accion={
          <Link href="/deudas" className="pb-1.5 text-[17px] font-semibold text-azul">
            Deudas ›
          </Link>
        }
      />

      <Tarjeta className="flex flex-col gap-1">
        <p className="text-[15px] text-texto-2">Total ahorrado</p>
        <p className="text-[40px] font-extrabold leading-tight tracking-tight tabular-nums"><Monto texto={dinero(total)} /></p>
        {metas.length > 0 && totalAlCierre > total && (
          <p className="text-[15px] text-texto-2">
            A tu ritmo actual: <span className="font-semibold text-verde"><Monto texto={dinero(totalAlCierre)} /></span> al 31 de diciembre
          </p>
        )}
      </Tarjeta>

      {metas.map((m) => {
        const falta = Math.max(0, m.objetivo - m.ahorrado);
        const cuota = cuotaMensual(falta, hoy, m.fecha_objetivo);
        const avance = fraccion(m.ahorrado, m.objetivo);
        const p = proyecciones.get(m.id);
        const reto = m.reto_base ? semanaDelReto(m.reto_base, fechaLima(m.creado), hoy) : null;
        const aportar = new URLSearchParams({ tipo: "AHORRO", meta: m.id });
        if (reto && !reto.terminado) {
          aportar.set("monto", reto.monto.toFixed(2));
          aportar.set("concepto", `Reto semana ${reto.semana}`);
        }
        const proyeccion =
          falta === 0
            ? null
            : !p?.mesEstimado
              ? "Sin aportes en los últimos 3 meses"
              : p.llegaATiempo === false
                ? `A este ritmo llegas en ${etiquetaMes(p.mesEstimado)}: tarde`
                : `A este ritmo la completas en ${etiquetaMes(p.mesEstimado)}`;
        return (
          <Tarjeta key={m.id} className="flex items-center gap-4">
            <AnilloProgreso fraccion={avance} etiqueta={`${m.nombre} al ${Math.round(avance * 100)}%`} />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-[17px] font-bold">{m.nombre}</p>
              <p className="text-[15px] text-texto-2 tabular-nums">
                <Monto texto={dinero(m.ahorrado)} /> de <Monto texto={dinero(m.objetivo)} />
              </p>
              <p className="text-[15px] font-semibold text-verde">
                <ConMontos
                  texto={falta === 0
                  ? "¡Meta cumplida!"
                  : reto
                    ? reto.terminado
                      ? "Reto terminado"
                      : `Semana ${reto.semana} de 52: aporta ${dinero(reto.monto)}`
                    : cuota
                      ? `${dinero(cuota)} al mes`
                      : "Sin fecha límite"}
                />
              </p>
              {proyeccion && (
                <p className={`text-[13px] ${p?.llegaATiempo === false ? "text-rojo" : "text-texto-2"}`}>{proyeccion}</p>
              )}
            </div>
            {falta > 0 && (
              <Link
                href={`/agregar?${aportar}`}
                className="rounded-full bg-verde-relleno/15 px-4 py-2 text-[15px] font-semibold text-verde"
              >
                Aportar
              </Link>
            )}
          </Tarjeta>
        );
      })}

      {fondo && (
        <section className="flex flex-col gap-2 rounded-[22px] bg-tinte-morado px-5 py-4">
          <p className="text-[17px] font-semibold">Fondo de emergencia</p>
          <p className="text-[15px] leading-snug">
            Con tus gastos de ~<Monto texto={dinero(fondo.gastoMensual)} /> al mes, te conviene guardar entre{" "}
            <b><Monto texto={dinero(fondo.minimo)} /></b> (3 meses) y <b><Monto texto={dinero(fondo.ideal)} /></b> (6 meses).
          </p>
          {metaEmergencia ? (
            metaEmergencia.objetivo < fondo.minimo && (
              <p className="text-[15px] text-texto-2">
                Tu meta “{metaEmergencia.nombre}” es de <Monto texto={dinero(metaEmergencia.objetivo)} />: considera subirla.
              </p>
            )
          ) : (
            <form action={crearMetaEmergencia}>
              <BotonEnviar texto={<>Crear meta de <Monto texto={dinero(fondo.ideal)} /></>} textoEnviando="Creando…" clase="bg-morado text-fondo" />
            </form>
          )}
        </section>
      )}

      <ListaAportes aportes={recientes} />

      {!metas.some((m) => m.reto_base) && <FormularioReto moneda={perfil.moneda_base} />}

      <FormularioMeta />
    </Pantalla>
  );
}
