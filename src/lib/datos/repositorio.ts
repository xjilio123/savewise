import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Categoria, Database, Meta, Movimiento, Perfil, TipoMovimiento } from "@/lib/supabase/tipos";

export type MetaConProgreso = Meta & { ahorrado: number };

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
  };
}
