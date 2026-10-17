import { FormularioBolsa } from "@/app/(app)/para-mi/FormularioBolsa";
import { Barra } from "@/components/Anillos";
import { Encabezado, Grupo, Pantalla } from "@/components/ui";
import { formatearDinero, fraccion, paraMiPorDia, type Resumen } from "@/lib/dinero";
import { fechaCorta, type RangoMes } from "@/lib/fechas";
import { Monto } from "@/components/Monto";

export type DatosParaMi = {
  moneda: string;
  resumen: Resumen;
  periodo: RangoMes;
  etiquetaPeriodo: string;
  hoy: string;
  ultimos: { id: string; concepto: string; fecha: string; monto: number }[];
};

export function VistaParaMi({ moneda, resumen: r, periodo, etiquetaPeriodo, hoy, ultimos }: DatosParaMi) {
  const dinero = (n: number) => formatearDinero(n, moneda);

  return (
    <Pantalla>
      <Encabezado titulo="Para mí" subtitulo={etiquetaPeriodo} atras={{ href: "/", texto: "Inicio" }} />

      <section className="flex flex-col gap-1.5 rounded-[28px] bg-gradient-to-br from-morado to-[#5b2a94] p-6 text-white">
        <p className="text-[15px] font-semibold text-white/85">Te quedan</p>
        <p className="text-[44px] font-extrabold leading-tight tracking-tight tabular-nums"><Monto texto={dinero(r.paraMiRestante)} /></p>
        <p className="text-[15px] text-white/85">de <Monto texto={dinero(r.paraMi)} /> en este periodo</p>
        <div className="py-1">
          <Barra fraccion={fraccion(r.ocio, r.paraMi)} clase="text-white" />
        </div>
        <p className="text-[17px] font-bold">
          <Monto texto={dinero(paraMiPorDia(r.paraMiRestante, periodo))} /> por día · {periodo.diasRestantes}{" "}
          {periodo.diasRestantes === 1 ? "día" : "días"}
        </p>
      </section>

      <FormularioBolsa hoy={hoy} actual={r.paraMi} />

      {ultimos.length > 0 && (
        <Grupo titulo="Últimos gastos">
          {ultimos.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[17px]">{m.concepto}</p>
                <p className="text-[15px] text-texto-2">{fechaCorta(m.fecha)}</p>
              </div>
              <p className="text-[17px] font-semibold tabular-nums">−<Monto texto={dinero(m.monto)} /></p>
            </div>
          ))}
        </Grupo>
      )}
    </Pantalla>
  );
}
