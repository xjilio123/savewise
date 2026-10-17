import { Encabezado, Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { hoyLima } from "@/lib/fechas";
import { requerirSesion } from "@/lib/supabase/servidor";
import { TIPOS_FORMULARIO } from "@/lib/validacion";
import { FormularioMovimiento } from "./FormularioMovimiento";

export default async function Agregar({ searchParams }: PageProps<"/agregar">) {
  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const [perfil, categorias, metas, deudas, params] = await Promise.all([
    repo.perfil(),
    repo.categorias(),
    repo.metas(),
    repo.deudas(),
    searchParams,
  ]);
  const abiertas = deudas.filter((d) => !d.cerrada);

  // Los parámetros de la URL solo preseleccionan opciones que ya existen.
  const tipoPedido = typeof params.tipo === "string" ? params.tipo : "";
  const tipo = (TIPOS_FORMULARIO as readonly string[]).includes(tipoPedido) ? tipoPedido : "GASTO";
  const metaId = metas.find((m) => m.id === params.meta)?.id ?? "";
  // "Pagar cuota" desde Deudas: gasto vinculado, con el nombre y la cuota ya puestos.
  const deuda = abiertas.find((d) => d.id === params.deuda);

  return (
    <Pantalla>
      <Encabezado titulo="Nuevo movimiento" atras={{ href: "/", texto: "Inicio" }} />
      <FormularioMovimiento
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        metas={metas.map((m) => ({ id: m.id, nombre: m.nombre }))}
        deudas={abiertas.map((d) => ({ id: d.id, nombre: d.nombre }))}
        hoy={hoyLima()}
        monedaBase={perfil.moneda_base}
        inicial={
          deuda
            ? {
                tipo: "GASTO",
                deuda_id: deuda.id,
                concepto: `Pago ${deuda.nombre}`.slice(0, 80),
                monto: deuda.cuota_mensual?.toFixed(2),
              }
            : { tipo, meta_id: metaId }
        }
      />
    </Pantalla>
  );
}
