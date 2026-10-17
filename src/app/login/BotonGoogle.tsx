"use client";

import { useState } from "react";
import { LogoGoogle } from "@/components/Icono";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

export function BotonGoogle() {
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState(false);

  async function entrar() {
    setCargando(true);
    setFallo(false);
    const { error } = await crearClienteNavegador().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setCargando(false);
      setFallo(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={entrar}
        disabled={cargando}
        className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-texto py-4 text-[17px] font-bold text-fondo transition active:scale-[0.98] disabled:opacity-60"
      >
        <span className="grid size-7 place-items-center rounded-full bg-white">
          <LogoGoogle className="size-[18px]" />
        </span>
        {cargando ? "Abriendo Google…" : "Continuar con Google"}
      </button>
      {fallo && (
        <p role="alert" className="text-center text-[15px] text-rojo">
          No se pudo conectar con Google. Intenta de nuevo.
        </p>
      )}
    </>
  );
}
