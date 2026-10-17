import { redirect } from "next/navigation";
import { CierreMes } from "@/components/CierreMes";
import { VistaInicio } from "@/components/vistas/VistaInicio";
import { generarConsejos } from "@/lib/consejos";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { calcularResumen, formatearDinero } from "@/lib/dinero";
import { etiquetaRango, fechaLarga, hoyLima, periodoFinanciero, sumarDias } from "@/lib/fechas";
import { sobranteDelPeriodo } from "@/lib/planificacion";
import { requerirSesion } from "@/lib/supabase/servidor";

export default async function Inicio() {
  const { supabase, usuario } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const hoy = hoyLima();
  // Perfil y movimientos en paralelo. La ventana de -64/+32 días contiene el periodo actual y el anterior.
  const [perfil, ventana] = await Promise.all([
    repo.perfil(),
    repo.movimientosEntre(sumarDias(hoy, -64), sumarDias(hoy, 32)),
  ]);
  if (perfil.sueldo_mensual <= 0) redirect("/bienvenida");

  const enRango = (desde: string, hasta: string) => ventana.filter((m) => m.fecha >= desde && m.fecha <= hasta);
  const periodo = periodoFinanciero(hoy, perfil.dia_pago);
  const movimientos = enRango(periodo.desde, periodo.hasta);
  const resumen = calcularResumen(perfil.sueldo_mensual, movimientos);

  // Cierre de mes: los primeros 7 días del periodo, si en el anterior sobró algo sin asignar.
  let cierre = null;
  if (periodo.diasDelMes - periodo.diasRestantes < 7) {
    const anterior = periodoFinanciero(sumarDias(periodo.desde, -1), perfil.dia_pago);
    const delAnterior = enRango(anterior.desde, anterior.hasta);
    const sobrante = sobranteDelPeriodo(calcularResumen(perfil.sueldo_mensual, delAnterior).sinAsignar, delAnterior.length);
    if (sobrante > 0) {
      const metas = await repo.metas();
      cierre = (
        <CierreMes
          clave={anterior.desde}
          periodo={etiquetaRango(anterior.desde, anterior.hasta)}
          sobrante={formatearDinero(sobrante, perfil.moneda_base)}
          metas={metas.filter((m) => m.ahorrado < m.objetivo).map((m) => ({ id: m.id, nombre: m.nombre }))}
        />
      );
    }
  }

  return (
    <VistaInicio
      fecha={fechaLarga(hoy)}
      periodo={etiquetaRango(periodo.desde, periodo.hasta)}
      inicial={(perfil.nombre || usuario.email || "?").charAt(0).toUpperCase()}
      moneda={perfil.moneda_base}
      resumen={resumen}
      consejo={generarConsejos(resumen, periodo, perfil.moneda_base)[0] ?? null}
      sinMovimientos={movimientos.length === 0}
      extra={cierre}
    />
  );
}
