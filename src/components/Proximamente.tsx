import { Encabezado, Pantalla, Tarjeta } from "@/components/ui";

export function Proximamente({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Pantalla>
      <Encabezado titulo={titulo} />
      <Tarjeta className="flex flex-col gap-2">
        <p className="w-fit rounded-full bg-azul-relleno/15 px-3 py-1 text-[13px] font-semibold text-azul">Fase 2</p>
        <p className="text-[17px] leading-relaxed text-texto-2">{texto}</p>
      </Tarjeta>
    </Pantalla>
  );
}
