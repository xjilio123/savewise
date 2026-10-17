import { Barra } from "@/components/Anillos";
import { Encabezado, Pantalla } from "@/components/ui";
import { CLASES_COLOR } from "@/lib/colores";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { formatearDinero } from "@/lib/dinero";
import { etiquetaRango, hoyLima, periodoFinanciero } from "@/lib/fechas";
import { estadoTopes } from "@/lib/planificacion";
import { requerirSesion } from "@/lib/supabase/servidor";
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
      <Encabezado titulo="Topes" subtitulo={etiquetaRango(periodo.desde, periodo.hasta)} atras={{ href: "/ajustes", texto: "Ajustes" }} />
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
