import { redirect } from "next/navigation";
import { VistaInicio } from "@/components/vistas/VistaInicio";
import { generarConsejos } from "@/lib/consejos";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { calcularResumen } from "@/lib/dinero";
import { etiquetaRango, fechaLarga, hoyLima, periodoFinanciero, sumarDias } from "@/lib/fechas";
import { requerirSesion } from "@/lib/supabase/servidor";

export default async function Inicio() {
  const { supabase, usuario } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const hoy = hoyLima();
  // Perfil y movimientos en paralelo: la ventana de ±32 días siempre contiene el periodo financiero.
  const [perfil, ventana] = await Promise.all([
    repo.perfil(),
    repo.movimientosEntre(sumarDias(hoy, -32), sumarDias(hoy, 32)),
  ]);
  if (perfil.sueldo_mensual <= 0) redirect("/bienvenida");

  const periodo = periodoFinanciero(hoy, perfil.dia_pago);
  const movimientos = ventana.filter((m) => m.fecha >= periodo.desde && m.fecha <= periodo.hasta);
  const resumen = calcularResumen(perfil.sueldo_mensual, movimientos);

  return (
    <VistaInicio
      fecha={fechaLarga(hoy)}
      periodo={etiquetaRango(periodo.desde, periodo.hasta)}
      inicial={(perfil.nombre || usuario.email || "?").charAt(0).toUpperCase()}
      moneda={perfil.moneda_base}
      resumen={resumen}
      consejo={generarConsejos(resumen, periodo, perfil.moneda_base)[0] ?? null}
      sinMovimientos={movimientos.length === 0}
    />
  );
}
