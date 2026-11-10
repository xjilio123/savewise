"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Descarga el respaldo completo. Al terminar, la página se actualiza para mostrar
 * «Último respaldo: hoy» (la descarga marca la fecha en el servidor).
 */
export function BotonRespaldo({ children, className }: { children: ReactNode; className: string }) {
  const router = useRouter();
  return (
    <a href="/api/respaldo" download onClick={() => setTimeout(() => router.refresh(), 2500)} className={className}>
      {children}
    </a>
  );
}
