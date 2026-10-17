import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { escaparLike, TAMANO_PAGINA, type Filtros } from "@/lib/filtros";
import type { Categoria, ColorApp, Database, Deuda, Meta, Movimiento, Perfil, TipoMovimiento } from "@/lib/supabase/tipos";

export type MetaConProgreso = Meta & { ahorrado: number };
export type DeudaConPagos = Deuda & { pagado: number };
export type Aporte = Pick<Movimiento, "id" | "fecha" | "concepto" | "monto" | "moneda"> & { meta: { nombre: string } | null };
export type FilaHistorial = Movimiento & { categoria: { nombre: string; color: ColorApp } | null };
export type GastoCategoria = {
  id: string | null;
  nombre: string;
  color: ColorApp;
  total: number;
  tope?: number | null;
  /** % frente al periodo anterior; null si antes no hubo gasto en esa categoría. */
  variacion?: number | null;
};
export type TotalMes = { mes: string; tipo: TipoMovimiento; total: number };

/**
 * Única puerta de acceso a los datos. Las pantallas no saben que detrás está Supabase:
 * si un día cambia el proveedor, solo se reescribe este archivo.
 * Ninguna consulta filtra por user_id a mano: lo hace RLS en la base de datos.
 */
export function crearRepositorio(supabase: SupabaseClient<Database>) {
  async function obtener<T>(consulta: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
    const { data, error } = await consulta;
    if (error || data === null) throw new Error("No se pudieron leer los datos");
    return data;
  }

  return {
    perfil(): Promise<Perfil> {
      return obtener(supabase.from("perfiles").select("*").single());
    },

    movimientosEntre(desde: string, hasta: string): Promise<Movimiento[]> {
      return obtener(
        supabase
          .from("movimientos")
          .select("*")
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha", { ascending: false })
          .order("creado", { ascending: false }),
      );
    },

    async movimiento(id: string): Promise<Movimiento | null> {
      const { data, error } = await supabase.from("movimientos").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error("No se pudieron leer los datos");
      return data;
    },

    /** Una página del Historial con el total de filas que cumplen el filtro. */
    async historial(f: Filtros): Promise<{ filas: FilaHistorial[]; cantidad: number }> {
      let consulta = supabase
        .from("movimientos")
        .select("*, categoria:categorias(nombre, color)", { count: "exact" })
        .gte("fecha", f.desde)
        .lte("fecha", f.hasta);
      if (f.tipo) consulta = consulta.eq("tipo", f.tipo);
      if (f.categoria) consulta = consulta.eq("categoria_id", f.categoria);
      if (f.q) consulta = consulta.ilike("concepto", `%${escaparLike(f.q)}%`);

      const desde = (f.pagina - 1) * TAMANO_PAGINA;
      const { data, count, error } = await consulta
        .order("fecha", { ascending: false })
        .order("creado", { ascending: false })
        .range(desde, desde + TAMANO_PAGINA - 1);

      // Pedir una página que no existe devuelve error de rango: se trata como vacía.
      if (error && error.code !== "PGRST103") throw new Error("No se pudieron leer los datos");
      return { filas: (data ?? []) as FilaHistorial[], cantidad: count ?? 0 };
    },

    async resumenFiltrado(f: Filtros): Promise<Record<TipoMovimiento, number>> {
      const filas = await obtener(
        supabase.rpc("resumen_filtrado", {
          p_desde: f.desde,
          p_hasta: f.hasta,
          p_tipo: f.tipo,
          p_categoria: f.categoria,
          p_texto: f.q,
        }),
      );
      const totales: Record<TipoMovimiento, number> = { INGRESO: 0, GASTO: 0, AHORRO: 0, PARA_MI: 0, OCIO: 0 };
      for (const fila of filas) totales[fila.tipo] = Number(fila.total);
      return totales;
    },

    async gastosPorCategoria(desde: string, hasta: string): Promise<GastoCategoria[]> {
      const filas = await obtener(supabase.rpc("gastos_por_categoria", { p_desde: desde, p_hasta: hasta }));
      return filas.map((f) => ({ id: f.categoria_id, nombre: f.nombre, color: f.color, total: Number(f.total) }));
    },

    async totalesPorMes(desdeMes: string, hastaMes: string): Promise<TotalMes[]> {
      const filas = await obtener(
        supabase.from("resumen_mensual").select("mes, tipo, total").gte("mes", desdeMes).lte("mes", hastaMes),
      );
      return filas
        .filter((f): f is { mes: string; tipo: TipoMovimiento; total: number } => Boolean(f.mes && f.tipo))
        .map((f) => ({ mes: f.mes, tipo: f.tipo, total: Number(f.total ?? 0) }));
    },

    ultimos(tipo: TipoMovimiento, limite: number): Promise<Movimiento[]> {
      return obtener(
        supabase
          .from("movimientos")
          .select("*")
          .eq("tipo", tipo)
          .order("fecha", { ascending: false })
          .order("creado", { ascending: false })
          .limit(limite),
      );
    },

    /** Aportes a metas desde una fecha, para calcular el ritmo de ahorro. */
    aportesDesde(desde: string): Promise<{ meta_id: string | null; fecha: string; monto_base: number | null }[]> {
      return obtener(
        supabase.from("movimientos").select("meta_id, fecha, monto_base").eq("tipo", "AHORRO").gte("fecha", desde),
      );
    },

    /** Últimos aportes a metas, para revisarlos o borrarlos desde Ahorros. */
    async aportesRecientes(limite: number): Promise<Aporte[]> {
      return (await obtener(
        supabase
          .from("movimientos")
          .select("id, fecha, concepto, monto, moneda, meta:metas(nombre)")
          .eq("tipo", "AHORRO")
          .order("fecha", { ascending: false })
          .order("creado", { ascending: false })
          .limit(limite),
      )) as Aporte[];
    },

    categorias(): Promise<Categoria[]> {
      return obtener(supabase.from("categorias").select("*").order("nombre"));
    },

    async metas(): Promise<MetaConProgreso[]> {
      const [metas, aportes] = await Promise.all([
        obtener(supabase.from("metas").select("*").eq("archivada", false).order("creado")),
        obtener(supabase.from("movimientos").select("meta_id, monto_base").eq("tipo", "AHORRO")),
      ]);
      const porMeta = new Map<string, number>();
      for (const a of aportes) {
        if (!a.meta_id) continue;
        porMeta.set(a.meta_id, (porMeta.get(a.meta_id) ?? 0) + Math.round((a.monto_base ?? 0) * 100));
      }
      return metas.map((m) => ({ ...m, ahorrado: (porMeta.get(m.id) ?? 0) / 100 }));
    },

    /** Deudas con lo pagado: la suma de los gastos vinculados a cada una. */
    async deudas(): Promise<DeudaConPagos[]> {
      const [deudas, pagos] = await Promise.all([
        obtener(supabase.from("deudas").select("*").order("cerrada").order("creado")),
        obtener(supabase.from("movimientos").select("deuda_id, monto_base").not("deuda_id", "is", null)),
      ]);
      const porDeuda = new Map<string, number>();
      for (const p of pagos) {
        if (!p.deuda_id) continue;
        porDeuda.set(p.deuda_id, (porDeuda.get(p.deuda_id) ?? 0) + Math.round((p.monto_base ?? 0) * 100));
      }
      return deudas.map((d) => ({ ...d, pagado: (porDeuda.get(d.id) ?? 0) / 100 }));
    },
  };
}
