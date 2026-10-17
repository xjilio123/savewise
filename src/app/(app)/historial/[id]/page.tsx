import { notFound } from "next/navigation";
import { actualizarMovimiento, eliminarMovimiento } from "@/app/acciones";
import { FormularioMovimiento } from "@/app/(app)/agregar/FormularioMovimiento";
import { Encabezado, Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { hoyLima } from "@/lib/fechas";
import { requerirSesion } from "@/lib/supabase/servidor";
import { esquemaId } from "@/lib/validacion";

export default async function EditarMovimiento({ params }: PageProps<"/historial/[id]">) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) notFound();

  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  // RLS: si el movimiento es de otra persona, la consulta no lo devuelve y se responde 404.
  const [movimiento, perfil, categorias, metas, deudas] = await Promise.all([
    repo.movimiento(id),
    repo.perfil(),
    repo.categorias(),
    repo.metas(),
    repo.deudas(),
  ]);
  if (!movimiento) notFound();

  return (
    <Pantalla>
      <Encabezado titulo="Editar movimiento" atras={{ href: "/historial", texto: "Historial" }} />
      <FormularioMovimiento
        accion={actualizarMovimiento.bind(null, id)}
        textoBoton="Guardar cambios"
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        metas={metas.map((m) => ({ id: m.id, nombre: m.nombre }))}
        deudas={deudas
          .filter((d) => !d.cerrada || d.id === movimiento.deuda_id)
          .map((d) => ({ id: d.id, nombre: d.nombre }))}
        hoy={hoyLima()}
        monedaBase={perfil.moneda_base}
        inicial={{
          tipo: movimiento.tipo,
          monto: movimiento.monto.toFixed(2),
          concepto: movimiento.concepto,
          fecha: movimiento.fecha,
          moneda: movimiento.moneda,
          categoria_id: movimiento.categoria_id ?? "",
          meta_id: movimiento.meta_id ?? "",
          deuda_id: movimiento.deuda_id ?? "",
          recurrente: movimiento.recurrente,
        }}
      />

      <details className="rounded-[22px] bg-tarjeta">
        <summary className="cursor-pointer list-none px-5 py-4 text-center text-[17px] font-semibold text-rojo">
          Eliminar movimiento
        </summary>
        <form action={eliminarMovimiento.bind(null, id)} className="flex flex-col gap-3 px-4 pb-4">
          <p className="text-center text-[15px] text-texto-2">Esto no se puede deshacer.</p>
          <button type="submit" className="rounded-[18px] bg-rojo py-3.5 text-[17px] font-bold text-fondo">
            Sí, eliminar
          </button>
        </form>
      </details>
    </Pantalla>
  );
}
