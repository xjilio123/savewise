import { VistaParaMi } from "@/components/vistas/VistaParaMi";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { calcularResumen } from "@/lib/dinero";
import { etiquetaRango, hoyLima, periodoFinanciero } from "@/lib/fechas";
import { requerirUsuario } from "@/lib/supabase/servidor";

export default async function ParaMi() {
  const { supabase } = await requerirUsuario();
  const repo = crearRepositorio(supabase);
  const perfil = await repo.perfil();
  const hoy = hoyLima();
  const periodo = periodoFinanciero(hoy, perfil.dia_pago);
  const movimientos = await repo.movimientosEntre(periodo.desde, periodo.hasta);

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
