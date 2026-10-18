import { notFound } from "next/navigation";
import { actualizarCategoria, eliminarCategoria } from "@/app/acciones";
import { FormularioCategoria } from "@/app/(app)/categorias/FormularioCategoria";
import { ConfirmarAccion } from "@/components/ConfirmarAccion";
import { Icono } from "@/components/Icono";
import { Encabezado, Pantalla, Tarjeta } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { requerirSesion } from "@/lib/supabase/servidor";
import { esquemaId } from "@/lib/validacion";

export default async function EditarCategoria({ params }: PageProps<"/categorias/[id]">) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) notFound();

  const { supabase } = await requerirSesion();
  // RLS: categorías y movimientos de otra persona no se devuelven.
  const [categorias, { count }] = await Promise.all([
    crearRepositorio(supabase).categorias(),
    supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("categoria_id", id),
  ]);
  const categoria = categorias.find((c) => c.id === id);
  if (!categoria) notFound();
  const movimientos = count ?? 0;

  return (
    <Pantalla>
      <Encabezado titulo="Editar categoría" atras={{ href: "/categorias", texto: "Categorías" }} />
      <Tarjeta>
        <FormularioCategoria
          accion={actualizarCategoria.bind(null, id)}
          ocupados={categorias.filter((c) => c.id !== id).map((c) => c.color)}
          inicial={{ nombre: categoria.nombre, color: categoria.color }}
          textoBoton="Guardar cambios"
        />
      </Tarjeta>

      <ConfirmarAccion
        accion={eliminarCategoria.bind(null, id)}
        claseBoton="flex w-full items-center justify-center gap-2 rounded-[22px] bg-tarjeta px-5 py-4 text-[17px] font-semibold text-rojo"
        titulo={`¿Eliminar «${categoria.nombre}»?`}
        mensaje={
          movimientos === 0
            ? "No tiene movimientos. Se borra también su tope. No se puede deshacer."
            : `Sus ${movimientos === 1 ? "1 movimiento" : `${movimientos} movimientos`} se conservan como «Sin categoría». Se borra también su tope. No se puede deshacer.`
        }
        confirmar="Eliminar categoría"
        confirmando="Eliminando…"
      >
        <Icono nombre="basura" className="size-5" />
        Eliminar categoría
      </ConfirmarAccion>
    </Pantalla>
  );
}
