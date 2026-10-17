"use client";

import { useFormStatus } from "react-dom";

export function BotonEnviar({ texto, textoEnviando = "Guardando…", clase = "bg-texto text-fondo" }: {
  texto: string;
  textoEnviando?: string;
  clase?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full rounded-[20px] py-4 text-[17px] font-bold transition active:scale-[0.98] disabled:opacity-60 ${clase}`}
    >
      {pending ? textoEnviando : texto}
    </button>
  );
}
