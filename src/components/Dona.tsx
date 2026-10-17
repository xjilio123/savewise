import type { ReactNode } from "react";

type Segmento = { valor: number; clase: string };

/** Dona de gastos por categoría. Cada segmento usa currentColor de su clase (compatible con la CSP). */
export function Dona({ segmentos, etiqueta, children }: { segmentos: Segmento[]; etiqueta: string; children: ReactNode }) {
  const radio = 90;
  const circunferencia = 2 * Math.PI * radio;
  const total = segmentos.reduce((s, x) => s + Math.max(0, x.valor), 0);
  const separacion = segmentos.length > 1 ? 2 : 0;
  let acumulado = 0;

  return (
    <div className="relative size-60 shrink-0">
      <svg viewBox="0 0 240 240" className="size-full -rotate-90" role="img" aria-label={etiqueta}>
        <circle cx={120} cy={120} r={radio} fill="none" stroke="currentColor" strokeWidth={28} className="text-control" />
        {total > 0 &&
          segmentos.map((s, i) => {
            const largo = (Math.max(0, s.valor) / total) * circunferencia;
            const desplazamiento = -acumulado;
            acumulado += largo;
            return (
              <circle
                key={i}
                cx={120}
                cy={120}
                r={radio}
                fill="none"
                stroke="currentColor"
                strokeWidth={28}
                strokeDasharray={`${Math.max(0, largo - separacion)} ${circunferencia}`}
                strokeDashoffset={desplazamiento}
                className={s.clase}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
