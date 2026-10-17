type Anillo = { fraccion: number; clase: string };

const tamano = 160;
const grosor = 16;

/** Anillos concéntricos estilo Actividad: cada anillo es una parte del sueldo. */
export function Anillos({ anillos, etiqueta }: { anillos: Anillo[]; etiqueta: string }) {
  const centro = tamano / 2;
  return (
    <svg viewBox={`0 0 ${tamano} ${tamano}`} className="size-40 shrink-0 -rotate-90" role="img" aria-label={etiqueta}>
      {anillos.map((a, i) => {
        const radio = centro - grosor / 2 - i * (grosor + 4);
        const circunferencia = 2 * Math.PI * radio;
        const largo = Math.min(1, Math.max(0, a.fraccion)) * circunferencia;
        return (
          <g key={radio} className={a.clase}>
            <circle cx={centro} cy={centro} r={radio} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={grosor} />
            {largo > 0 && (
              <circle
                cx={centro}
                cy={centro}
                r={radio}
                fill="none"
                stroke="currentColor"
                strokeWidth={grosor}
                strokeLinecap="round"
                strokeDasharray={`${largo} ${circunferencia}`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Anillo único con el porcentaje al centro (metas de ahorro). */
export function AnilloProgreso({ fraccion, etiqueta }: { fraccion: number; etiqueta: string }) {
  const radio = 34;
  const circunferencia = 2 * Math.PI * radio;
  const largo = Math.min(1, Math.max(0, fraccion)) * circunferencia;
  return (
    <div className="relative size-[84px] shrink-0">
      <svg viewBox="0 0 84 84" className="size-full -rotate-90 text-verde-relleno" role="img" aria-label={etiqueta}>
        <circle cx={42} cy={42} r={radio} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={10} />
        {largo > 0 && (
          <circle
            cx={42}
            cy={42}
            r={radio}
            fill="none"
            stroke="currentColor"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${largo} ${circunferencia}`}
          />
        )}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[15px] font-bold">{Math.round(fraccion * 100)}%</span>
    </div>
  );
}

/** Barra de progreso dibujada en SVG (sin estilos inline, compatible con la CSP). */
export function Barra({ fraccion, clase }: { fraccion: number; clase: string }) {
  const ancho = `${Math.round(Math.min(1, Math.max(0, fraccion)) * 1000) / 10}%`;
  return (
    <svg className={`h-2.5 w-full ${clase}`} aria-hidden="true">
      <rect width="100%" height="100%" rx="5" fill="currentColor" fillOpacity={0.25} />
      <rect width={ancho} height="100%" rx="5" fill="currentColor" />
    </svg>
  );
}
