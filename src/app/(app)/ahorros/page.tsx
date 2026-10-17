import Link from "next/link";
import { AnilloProgreso } from "@/components/Anillos";
import { Encabezado, Pantalla, Tarjeta } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { cuotaMensual, formatearDinero, fraccion } from "@/lib/dinero";
import { hoyLima } from "@/lib/fechas";
import { requerirUsuario } from "@/lib/supabase/servidor";
import { FormularioMeta } from "./FormularioMeta";

export default async function Ahorros() {
  const { supabase } = await requerirUsuario();
  const repo = crearRepositorio(supabase);
  const [perfil, metas] = await Promise.all([repo.perfil(), repo.metas()]);
  const hoy = hoyLima();
  const dinero = (n: number) => formatearDinero(n, perfil.moneda_base);
  const total = metas.reduce((suma, m) => suma + Math.round(m.ahorrado * 100), 0) / 100;

  return (
    <Pantalla>
      <Encabezado
        titulo="Ahorros"
        subtitulo={metas.length === 1 ? "1 meta activa" : `${metas.length} metas activas`}
      />

      <Tarjeta>
        <p className="text-[15px] text-texto-2">Total ahorrado</p>
        <p className="text-[40px] font-extrabold leading-tight tracking-tight tabular-nums">{dinero(total)}</p>
      </Tarjeta>

      {metas.map((m) => {
        const falta = Math.max(0, m.objetivo - m.ahorrado);
        const cuota = cuotaMensual(falta, hoy, m.fecha_objetivo);
        const avance = fraccion(m.ahorrado, m.objetivo);
        return (
          <Tarjeta key={m.id} className="flex items-center gap-4">
            <AnilloProgreso fraccion={avance} etiqueta={`${m.nombre} al ${Math.round(avance * 100)}%`} />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-[17px] font-bold">{m.nombre}</p>
              <p className="text-[15px] text-texto-2 tabular-nums">
                {dinero(m.ahorrado)} de {dinero(m.objetivo)}
              </p>
              <p className="text-[15px] font-semibold text-verde">
                {falta === 0 ? "¡Meta cumplida!" : cuota ? `${dinero(cuota)} al mes` : "Sin fecha límite"}
              </p>
            </div>
            {falta > 0 && (
              <Link
                href={`/agregar?tipo=AHORRO&meta=${m.id}`}
                className="rounded-full bg-verde-relleno/15 px-4 py-2 text-[15px] font-semibold text-verde"
              >
                Aportar
              </Link>
            )}
          </Tarjeta>
        );
      })}

      <FormularioMeta />
    </Pantalla>
  );
}
