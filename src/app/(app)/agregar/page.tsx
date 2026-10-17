import { Encabezado, Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { hoyLima } from "@/lib/fechas";
import { requerirUsuario } from "@/lib/supabase/servidor";
import { TIPOS_FORMULARIO } from "@/lib/validacion";
import { FormularioMovimiento } from "./FormularioMovimiento";

export default async function Agregar({ searchParams }: PageProps<"/agregar">) {
  const { supabase } = await requerirUsuario();
  const repo = crearRepositorio(supabase);
  const [perfil, categorias, metas, params] = await Promise.all([
    repo.perfil(),
    repo.categorias(),
    repo.metas(),
    searchParams,
  ]);

  // Los parámetros de la URL solo preseleccionan opciones que ya existen.
  const tipoPedido = typeof params.tipo === "string" ? params.tipo : "";
  const tipo = (TIPOS_FORMULARIO as readonly string[]).includes(tipoPedido) ? tipoPedido : "GASTO";
  const metaId = metas.find((m) => m.id === params.meta)?.id ?? "";

  return (
    <Pantalla>
      <Encabezado titulo="Nuevo movimiento" atras={{ href: "/", texto: "Inicio" }} />
      <FormularioMovimiento
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        metas={metas.map((m) => ({ id: m.id, nombre: m.nombre }))}
        hoy={hoyLima()}
        monedaBase={perfil.moneda_base}
        inicial={{ tipo, meta_id: metaId }}
      />
    </Pantalla>
  );
}
