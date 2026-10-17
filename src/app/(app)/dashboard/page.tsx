import { VistaDashboard, type MesGrafico } from "@/components/vistas/VistaDashboard";
import { generarConsejos } from "@/lib/consejos";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { calcularResumen } from "@/lib/dinero";
import { etiquetaRango, hoyLima, periodoFinanciero, sumarDias } from "@/lib/fechas";
import { calendarioDePagos, variacion } from "@/lib/ideas";
import { estadoTopes } from "@/lib/planificacion";
import { requerirSesion } from "@/lib/supabase/servidor";
import { ResumenIA } from "./ResumenIA";

const nombreMes = new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" });

/** Los 12 meses calendario que terminan en el mes de `hoy`, como AAAA-MM-01. */
function ultimos12Meses(hoy: string): string[] {
  const [anio, mes] = hoy.split("-").map(Number) as [number, number];
  return Array.from({ length: 12 }, (_, i) => {
    const fecha = new Date(Date.UTC(anio, mes - 1 - (11 - i), 1));
    return fecha.toISOString().slice(0, 10);
  });
}

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const [perfil, parametros] = await Promise.all([repo.perfil(), searchParams]);
  const vista = parametros.vista === "anio" ? "anio" : "mes";

  const hoy = hoyLima();
  const periodo = periodoFinanciero(hoy, perfil.dia_pago);
  const meses = ultimos12Meses(hoy);

  const anterior = periodoFinanciero(sumarDias(periodo.desde, -1), perfil.dia_pago);
  const esMes = vista === "mes";

  const [movimientos, porCategoria, categorias, totales, porCategoriaAnterior, recientes, deudas] = await Promise.all([
    repo.movimientosEntre(periodo.desde, periodo.hasta),
    repo.gastosPorCategoria(periodo.desde, periodo.hasta),
    repo.categorias(),
    esMes ? Promise.resolve([]) : repo.totalesPorMes(meses[0]!, meses[11]!),
    esMes ? repo.gastosPorCategoria(anterior.desde, anterior.hasta) : Promise.resolve([]),
    // Para el calendario: lo del periodo y lo de antes (una suscripción pagada el mes pasado vence en este).
    esMes ? repo.movimientosEntre(sumarDias(periodo.desde, -45), periodo.hasta) : Promise.resolve([]),
    esMes ? repo.deudas() : Promise.resolve([]),
  ]);
  const totalAnterior = new Map(porCategoriaAnterior.map((c) => [c.id ?? "sin", c.total]));
  const pagos = esMes ? calendarioDePagos({ movimientos: recientes, deudas, desde: periodo.desde, hasta: periodo.hasta }) : [];
  const resumen = calcularResumen(perfil.sueldo_mensual, movimientos);
  const topePorId = new Map(categorias.map((c) => [c.id, c.tope]));
  const topes = estadoTopes(categorias, movimientos);

  const grafico: MesGrafico[] = meses.map((mes) => {
    const delMes = totales.filter((t) => t.mes === mes);
    const suma = (tipos: string[]) => delMes.filter((t) => tipos.includes(t.tipo)).reduce((s, t) => s + t.total, 0);
    return {
      etiqueta: nombreMes.format(new Date(`${mes}T12:00:00Z`)).replace(".", ""),
      gastos: suma(["GASTO", "OCIO"]),
      ahorros: suma(["AHORRO"]),
    };
  });

  return (
    <VistaDashboard
      vista={vista}
      moneda={perfil.moneda_base}
      etiquetaPeriodo={etiquetaRango(periodo.desde, periodo.hasta)}
      categorias={porCategoria.map((c) => ({
        ...c,
        tope: c.id ? topePorId.get(c.id) : null,
        variacion: variacion(c.total, totalAnterior.get(c.id ?? "sin")),
      }))}
      pagos={pagos}
      resumen={resumen}
      consejos={movimientos.length > 0 ? generarConsejos(resumen, periodo, perfil.moneda_base, topes) : []}
      meses={grafico}
      extra={vista === "mes" && movimientos.length > 0 && process.env.GEMINI_API_KEY ? <ResumenIA /> : null}
    />
  );
}
