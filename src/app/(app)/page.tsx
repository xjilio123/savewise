import { redirect } from "next/navigation";
import { VistaInicio } from "@/components/vistas/VistaInicio";
import { generarConsejos } from "@/lib/consejos";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { calcularResumen } from "@/lib/dinero";
import { etiquetaRango, fechaLarga, hoyLima, periodoFinanciero } from "@/lib/fechas";
import { requerirUsuario } from "@/lib/supabase/servidor";

export default async function Inicio() {
  const { supabase, usuario } = await requerirUsuario();
  const repo = crearRepositorio(supabase);
  const perfil = await repo.perfil();
  if (perfil.sueldo_mensual <= 0) redirect("/bienvenida");

  const hoy = hoyLima();
  const periodo = periodoFinanciero(hoy, perfil.dia_pago);
  const movimientos = await repo.movimientosEntre(periodo.desde, periodo.hasta);
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
