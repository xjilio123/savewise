import { Barra } from "@/components/Anillos";
import { COLOR_NIVEL, estadoEspacio, LIMITE_BASE } from "@/lib/espacio";

const ETIQUETA = { bien: "Todo bien", pronto: "Vigílalo", lleno: "Revisa el plan de Supabase" } as const;

/** Total de la base de la app frente al plan gratis de Supabase. Solo lo reciben los dueños. */
export function EspacioApp({ bytes, personas }: { bytes: number; personas: number }) {
  const estado = estadoEspacio(bytes, LIMITE_BASE, 0.8);
  return (
    <section className="flex flex-col gap-2 rounded-[22px] bg-tarjeta p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-texto-2">Solo tú lo ves</p>
      <h2 className="text-[17px] font-semibold">Base de datos de SaveWise</h2>
      <p className="text-[28px] font-extrabold leading-tight tracking-tight tabular-nums">
        {estado.usado} <span className="text-[17px] font-semibold text-texto-2">de {estado.total}</span>
      </p>
      <Barra fraccion={estado.fraccion} clase={COLOR_NIVEL[estado.nivel]} />
      <p className={`text-[15px] font-semibold ${COLOR_NIVEL[estado.nivel]}`}>
        {estado.porcentaje} · {ETIQUETA[estado.nivel]}
      </p>
      <p className="text-[13px] text-texto-2">
        {personas === 1 ? "1 persona usa" : `${personas} personas usan`} la app · plan gratis de Supabase. Te avisamos si pasa
        el 80%.
      </p>
    </section>
  );
}
