import { Barra } from "@/components/Anillos";
import { Encabezado, Grupo, Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { calcularResumen, formatearDinero, fraccion, paraMiPorDia } from "@/lib/dinero";
import { hoyLima, rangoDelMes } from "@/lib/fechas";
import { requerirUsuario } from "@/lib/supabase/servidor";
import { FormularioBolsa } from "./FormularioBolsa";

const fechaCorta = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function ParaMi() {
  const { supabase } = await requerirUsuario();
  const repo = crearRepositorio(supabase);
  const hoy = hoyLima();
  const mes = rangoDelMes(hoy);
  const [perfil, movimientos] = await Promise.all([repo.perfil(), repo.movimientosEntre(mes.desde, mes.hasta)]);
  const r = calcularResumen(perfil.sueldo_mensual, movimientos);
  const dinero = (n: number) => formatearDinero(n, perfil.moneda_base);
  const ocio = movimientos.filter((m) => m.tipo === "OCIO").slice(0, 10);
  const nombreMes = new Intl.DateTimeFormat("es-PE", { month: "long", timeZone: "UTC" }).format(new Date(`${hoy}T12:00:00Z`));

  return (
    <Pantalla>
      <Encabezado titulo="Para mí" subtitulo={nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} atras={{ href: "/", texto: "Inicio" }} />

      <section className="flex flex-col gap-1.5 rounded-[28px] bg-gradient-to-br from-morado to-[#5b2a94] p-6 text-white">
        <p className="text-[15px] font-semibold text-white/85">Te quedan</p>
        <p className="text-[44px] font-extrabold leading-tight tracking-tight tabular-nums">{dinero(r.paraMiRestante)}</p>
        <p className="text-[15px] text-white/85">de {dinero(r.paraMi)} este mes</p>
        <div className="py-1 text-white">
          <Barra fraccion={fraccion(r.ocio, r.paraMi)} clase="text-white" />
        </div>
        <p className="text-[17px] font-bold">
          {dinero(paraMiPorDia(r.paraMiRestante, mes))} por día · {mes.diasRestantes} días
        </p>
      </section>

      <FormularioBolsa hoy={hoy} actual={r.paraMi} />

      {ocio.length > 0 && (
        <Grupo titulo="Últimos gastos">
          {ocio.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[17px]">{m.concepto}</p>
                <p className="text-[15px] text-texto-2">{fechaCorta.format(new Date(`${m.fecha}T12:00:00Z`))}</p>
              </div>
              <p className="text-[17px] font-semibold tabular-nums">−{dinero(m.monto_base ?? m.monto)}</p>
            </div>
          ))}
        </Grupo>
      )}
    </Pantalla>
  );
}
