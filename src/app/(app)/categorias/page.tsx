import Link from "next/link";
import { crearCategoria } from "@/app/acciones";
import { Barra } from "@/components/Anillos";
import { Icono } from "@/components/Icono";
import { Encabezado, Pantalla } from "@/components/ui";
import { CLASES_COLOR } from "@/lib/colores";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { formatearDinero } from "@/lib/dinero";
import { etiquetaRango, hoyLima, periodoFinanciero } from "@/lib/fechas";
import { estadoTopes } from "@/lib/planificacion";
import { requerirSesion } from "@/lib/supabase/servidor";
import { FormularioCategoria } from "./FormularioCategoria";
import { FormularioTopes } from "./FormularioTopes";

export default async function Categorias() {
  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const perfil = await repo.perfil();
  const periodo = periodoFinanciero(hoyLima(), perfil.dia_pago);
  const [categorias, movimientos] = await Promise.all([repo.categorias(), repo.movimientosEntre(periodo.desde, periodo.hasta)]);
  const topes = new Map(estadoTopes(categorias, movimientos).map((t) => [t.id, t]));
  const dinero = (n: number) => formatearDinero(n, perfil.moneda_base);

  return (
    <Pantalla>
      <Encabezado titulo="Categorías" subtitulo={etiquetaRango(periodo.desde, periodo.hasta)} atras={{ href: "/ajustes", texto: "Ajustes" }} />

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-texto-2">Tus categorías</h2>
        <ul className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
          {categorias.map((cat) => (
            <li key={cat.id}>
              <Link href={`/categorias/${cat.id}`} className="flex items-center gap-3 py-3.5 text-[17px]">
                <span aria-hidden="true" className={`size-3.5 shrink-0 rounded-full ${CLASES_COLOR[cat.color].punto}`} />
                <span className="flex-1 truncate">{cat.nombre}</span>
                <Icono nombre="atras" className="size-4 rotate-180 text-texto-2" />
              </Link>
            </li>
          ))}
        </ul>
        <details className="rounded-[22px] border-2 border-dashed border-linea p-1 open:border-solid open:bg-tarjeta">
          <summary className="cursor-pointer list-none py-3 text-center text-[17px] font-semibold text-azul">+ Nueva categoría</summary>
          <div className="p-3">
            <FormularioCategoria accion={crearCategoria} ocupados={categorias.map((c) => c.color)} textoBoton="Crear categoría" />
          </div>
        </details>
      </section>

      <h2 className="px-1 pt-2 text-[13px] font-semibold uppercase tracking-wide text-texto-2">Topes del mes</h2>
      <p className="px-1 text-[15px] leading-snug text-texto-2">
        Pon un máximo mensual a las categorías que quieras cuidar. Te avisamos al llegar al 80%. Deja vacío para no tener tope.
      </p>
      <FormularioTopes
        moneda={perfil.moneda_base}
        categorias={categorias.map((cat) => {
          const t = topes.get(cat.id);
          return {
            id: cat.id,
            nombre: cat.nombre,
            punto: CLASES_COLOR[cat.color].punto,
            tope: cat.tope,
            detalle: t ? `${dinero(t.gastado)} de ${dinero(t.tope)}` : null,
            barra: t ? <Barra fraccion={t.fraccion} clase={t.fraccion >= 1 ? "text-rojo-relleno" : t.fraccion >= 0.8 ? "text-morado-relleno" : "text-verde-relleno"} /> : null,
          };
        })}
      />
    </Pantalla>
  );
}
