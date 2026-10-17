"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, type NombreIcono } from "@/components/Icono";

const pestanas: { ruta: string; nombre: string; icono: NombreIcono }[] = [
  { ruta: "/", nombre: "Inicio", icono: "inicio" },
  { ruta: "/historial", nombre: "Historial", icono: "historial" },
  { ruta: "/ahorros", nombre: "Ahorros", icono: "ahorros" },
  { ruta: "/dashboard", nombre: "Dashboard", icono: "dashboard" },
];

/** Barra flotante translúcida al estilo de iOS, con el botón "+" aparte. */
export function BarraPestanas() {
  const ruta = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center gap-3 px-5 pb-[max(env(safe-area-inset-bottom),16px)]"
    >
      <div className="flex flex-1 items-center justify-between rounded-full border border-black/5 bg-barra p-2 shadow-[0_8px_24px_rgb(0_0_0/0.12)] backdrop-blur-xl dark:border-white/10">
        {pestanas.map((p) => {
          const activa = p.ruta === "/" ? ruta === "/" : ruta.startsWith(p.ruta);
          return (
            <Link
              key={p.ruta}
              href={p.ruta}
              prefetch
              aria-label={p.nombre}
              aria-current={activa ? "page" : undefined}
              className={`flex items-center justify-center rounded-full py-2.5 transition-colors ${
                activa ? "bg-azul-relleno/15 px-5 text-azul" : "px-3 text-texto"
              }`}
            >
              <Icono nombre={p.icono} className="size-[26px]" />
            </Link>
          );
        })}
      </div>
      <Link
        href="/agregar"
        prefetch
        aria-label="Agregar movimiento"
        className="grid size-16 shrink-0 place-items-center rounded-full bg-azul-relleno text-white shadow-[0_8px_20px_rgb(0_113_227/0.35)] active:scale-95"
      >
        <Icono nombre="mas" className="size-8" />
      </Link>
    </nav>
  );
}
