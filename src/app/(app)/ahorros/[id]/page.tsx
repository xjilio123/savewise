import { notFound } from "next/navigation";
import { actualizarMeta, alternarMetaArchivada, eliminarMeta } from "@/app/acciones";
import { ConfirmarAccion } from "@/components/ConfirmarAccion";
import { Icono } from "@/components/Icono";
import { Encabezado, Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { requerirSesion } from "@/lib/supabase/servidor";
import { esquemaId } from "@/lib/validacion";
import { FormularioEditarMeta } from "./FormularioEditarMeta";

export default async function EditarMeta({ params }: PageProps<"/ahorros/[id]">) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) notFound();

  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  // RLS: si la meta es de otra persona, no se devuelve y se responde 404.
  const [meta, otras] = await Promise.all([repo.meta(id), repo.metas()]);
  if (!meta) notFound();
  const destinos = otras.filter((m) => m.id !== id);
  const plural = meta.aportes === 1 ? "su aporte" : `sus ${meta.aportes} aportes`;

  return (
    <Pantalla>
      <Encabezado titulo="Editar meta" atras={{ href: "/ahorros", texto: "Ahorros" }} />

      <FormularioEditarMeta
        accion={actualizarMeta.bind(null, id)}
        inicial={{ nombre: meta.nombre, objetivo: meta.objetivo.toFixed(2), fecha_objetivo: meta.fecha_objetivo ?? "" }}
      />

      <section className="flex flex-col gap-2 rounded-[22px] bg-tarjeta p-4">
        <p className="text-[15px] leading-snug text-texto-2">
          {meta.archivada
            ? "Esta meta está archivada: no aparece en Ahorros ni suma en el total."
            : "¿Ya la cumpliste o la dejaste? Archívala: deja de aparecer y de sumar en el total, y sus aportes siguen en tu historial."}
        </p>
        <form action={alternarMetaArchivada.bind(null, id, !meta.archivada)}>
          <button type="submit" className="w-full rounded-[14px] bg-fondo py-3 text-[17px] font-semibold text-azul">
            {meta.archivada ? "Reactivar meta" : "Archivar meta"}
          </button>
        </form>
      </section>

      <ConfirmarAccion
        accion={eliminarMeta.bind(null, id)}
        claseBoton="flex w-full items-center justify-center gap-2 rounded-[22px] bg-tarjeta px-5 py-4 text-[17px] font-semibold text-rojo"
        titulo={`¿Eliminar «${meta.nombre}»?`}
        mensaje={
          meta.aportes === 0
            ? "La meta no tiene aportes. No se puede deshacer."
            : `Tiene ${meta.aportes === 1 ? "1 aporte" : `${meta.aportes} aportes`}. Elige qué hacer con ${plural}. No se puede deshacer.`
        }
        confirmar="Eliminar meta"
        confirmando="Eliminando…"
        campos={
          meta.aportes > 0 && (
            <label className="flex flex-col gap-1 text-left text-[13px] text-texto-2">
              Qué hacer con {plural}
              <select
                name="destino"
                required
                defaultValue={destinos[0]?.id ?? "eliminar"}
                className="rounded-xl bg-fondo px-3 py-2.5 text-[15px] text-texto outline-none"
              >
                {destinos.map((d) => (
                  <option key={d.id} value={d.id}>
                    Moverlos a «{d.nombre}»
                  </option>
                ))}
                <option value="eliminar">Eliminarlos también</option>
              </select>
            </label>
          )
        }
      >
        <Icono nombre="basura" className="size-5" />
        Eliminar meta
      </ConfirmarAccion>
    </Pantalla>
  );
}
