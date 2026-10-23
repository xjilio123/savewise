import Link from "next/link";
import type { ReactNode } from "react";
import { Icono } from "@/components/Icono";
import { BotonPrivado } from "@/components/BotonPrivado";
import { ConMontos } from "@/components/Monto";

export function Pantalla({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-36">
      {children}
    </main>
  );
}

export function Encabezado({
  titulo,
  subtitulo,
  atras,
  accion,
}: {
  titulo: string;
  subtitulo?: string;
  atras?: { href: string; texto: string };
  accion?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1 pt-2">
      {atras && (
        <Link href={atras.href} className="-ml-1 flex w-fit items-center gap-0.5 text-[17px] text-azul">
          <Icono nombre="atras" className="size-5" />
          {atras.texto}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {subtitulo && <p className="text-[15px] font-semibold text-texto-2">{subtitulo}</p>}
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">{titulo}</h1>
        </div>
        <div className="flex items-center gap-3 pb-1">
          {accion}
          <BotonPrivado />
        </div>
      </div>
    </header>
  );
}

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] bg-tarjeta p-5 ${className}`}>{children}</section>;
}

export function Grupo({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {titulo && <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-texto-2">{titulo}</h2>}
      <div className="divide-y divide-linea overflow-hidden rounded-[22px] bg-tarjeta px-4">{children}</div>
    </div>
  );
}

export function MensajeError({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-[15px] font-medium text-rojo">
      {/* Algunos errores dicen montos ("Solo tienes S/ 120.00…"): respetan Ocultar montos. */}
      <ConMontos texto={texto} />
    </p>
  );
}

/** Aviso destacado, por ejemplo cuando no queda dinero sin asignar. `enTarjeta` si va dentro de otra tarjeta. */
export function Alerta({ texto, enTarjeta = false }: { texto: string; enTarjeta?: boolean }) {
  return (
    <p
      role="alert"
      className={`flex gap-2.5 rounded-2xl px-4 py-3 text-[15px] font-medium leading-snug text-naranja ${enTarjeta ? "bg-fondo" : "bg-tarjeta"}`}
    >
      <Icono nombre="alerta" className="mt-0.5 size-5 shrink-0" />
      <span>
        <ConMontos texto={texto} />
      </span>
    </p>
  );
}
