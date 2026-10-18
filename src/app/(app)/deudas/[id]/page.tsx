import { notFound } from "next/navigation";
import { actualizarDeuda } from "@/app/acciones";
import { FormularioDeuda } from "@/app/(app)/deudas/FormularioDeuda";
import { Encabezado, Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { requerirSesion } from "@/lib/supabase/servidor";
import { esquemaId } from "@/lib/validacion";

export default async function EditarDeuda({ params }: PageProps<"/deudas/[id]">) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) notFound();

  const { supabase } = await requerirSesion();
  // RLS: si la deuda es de otra persona, no se devuelve y se responde 404.
  const deuda = await crearRepositorio(supabase).deuda(id);
  if (!deuda) notFound();

  return (
    <Pantalla>
      <Encabezado titulo="Editar deuda" atras={{ href: "/deudas", texto: "Deudas" }} />
      <FormularioDeuda
        accion={actualizarDeuda.bind(null, id)}
        inicial={{
          nombre: deuda.nombre,
          tipo: deuda.tipo,
          monto_total: deuda.monto_total.toFixed(2),
          cuota_mensual: deuda.cuota_mensual?.toFixed(2) ?? "",
          dia_pago: deuda.dia_pago?.toString() ?? "",
          tea: deuda.tea?.toString() ?? "",
        }}
      />
      <p className="px-1 text-[13px] leading-snug text-texto-2">
        Lo que ya pagaste no cambia: se sigue sumando desde tus pagos registrados.
      </p>
    </Pantalla>
  );
}
