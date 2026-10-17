import { VistaParaMi } from "@/components/vistas/VistaParaMi";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { calcularResumen } from "@/lib/dinero";
import { etiquetaRango, hoyLima, periodoFinanciero, sumarDias } from "@/lib/fechas";
import { requerirSesion } from "@/lib/supabase/servidor";

export default async function ParaMi() {
  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const hoy = hoyLima();
  const [perfil, ventana] = await Promise.all([
    repo.perfil(),
    repo.movimientosEntre(sumarDias(hoy, -32), sumarDias(hoy, 32)),
  ]);
  const periodo = periodoFinanciero(hoy, perfil.dia_pago);
  const movimientos = ventana.filter((m) => m.fecha >= periodo.desde && m.fecha <= periodo.hasta);

  return (
    <VistaParaMi
      moneda={perfil.moneda_base}
      resumen={calcularResumen(perfil.sueldo_mensual, movimientos)}
      periodo={periodo}
      etiquetaPeriodo={etiquetaRango(periodo.desde, periodo.hasta)}
      hoy={hoy}
      ultimos={movimientos
        .filter((m) => m.tipo === "OCIO")
        .slice(0, 10)
        .map((m) => ({ id: m.id, concepto: m.concepto, fecha: m.fecha, monto: m.monto_base ?? m.monto }))}
    />
  );
}
