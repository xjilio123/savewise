import { notFound } from "next/navigation";
import { actualizarMovimiento, eliminarMovimiento } from "@/app/acciones";
import { FormularioMovimiento } from "@/app/(app)/agregar/FormularioMovimiento";
import { ConfirmarAccion } from "@/components/ConfirmarAccion";
import { Icono } from "@/components/Icono";
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
          nota: movimiento.nota,
          recurrente: movimiento.recurrente,
        }}
      />

      <ConfirmarAccion
        accion={eliminarMovimiento.bind(null, id, "/historial")}
        claseBoton="flex w-full items-center justify-center gap-2 rounded-[22px] bg-tarjeta px-5 py-4 text-[17px] font-semibold text-rojo"
        titulo="¿Eliminar este movimiento?"
        mensaje={`Se borrará «${movimiento.concepto}» y se recalcularán tus totales. No se puede deshacer.`}
        confirmar="Eliminar"
        confirmando="Eliminando…"
      >
        <Icono nombre="basura" className="size-5" />
        Eliminar movimiento
      </ConfirmarAccion>
    </Pantalla>
  );
}
