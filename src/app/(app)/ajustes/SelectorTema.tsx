import { guardarTema } from "@/app/acciones";
import type { Tema } from "@/lib/tema";

const opciones: { valor: Tema; nombre: string }[] = [
  { valor: "auto", nombre: "Automático" },
  { valor: "claro", nombre: "Claro" },
  { valor: "oscuro", nombre: "Oscuro" },
];

/** Control segmentado al estilo iOS. Funciona sin JavaScript: cada opción es un botón de envío. */
export function SelectorTema({ actual }: { actual: Tema }) {
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <div>
        <h2 className="text-[17px] font-semibold">Apariencia</h2>
        <p className="text-[13px] text-texto-2">Automático sigue el modo claro u oscuro de tu teléfono.</p>
      </div>
      <form action={guardarTema} className="flex rounded-[12px] bg-control p-1" aria-label="Tema">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="submit"
            name="tema"
            value={o.valor}
            aria-pressed={actual === o.valor}
            className={`flex-1 rounded-[9px] py-2 text-[15px] font-semibold transition ${
              actual === o.valor ? "bg-tarjeta shadow-sm" : "text-texto"
            }`}
          >
            {o.nombre}
          </button>
        ))}
      </form>
    </section>
  );
}
