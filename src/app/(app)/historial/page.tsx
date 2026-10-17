import { VistaHistorial } from "@/components/vistas/VistaHistorial";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { hoyLima, rangosRapidos } from "@/lib/fechas";
import { leerFiltros } from "@/lib/filtros";
import { requerirUsuario } from "@/lib/supabase/servidor";

export default async function Historial({ searchParams }: PageProps<"/historial">) {
  const { supabase } = await requerirUsuario();
  const repo = crearRepositorio(supabase);
  const [perfil, parametros] = await Promise.all([repo.perfil(), searchParams]);

  const hoy = hoyLima();
  const rangos = rangosRapidos(hoy, perfil.dia_pago);
  const filtros = leerFiltros(parametros, rangos.periodo);

  const [{ filas, cantidad }, totales, categorias] = await Promise.all([
    repo.historial(filtros),
    repo.resumenFiltrado(filtros),
    repo.categorias(),
  ]);

  return (
    <VistaHistorial
      filtros={filtros}
      filas={filas}
      cantidad={cantidad}
      totales={totales}
      categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
      rangos={rangos}
      moneda={perfil.moneda_base}
      hoy={hoy}
    />
  );
}
