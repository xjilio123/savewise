"use client";

import { useState } from "react";
import { crearTokenAtajo, revocarTokenAtajo } from "@/app/acciones";
import { ConfirmarAccion } from "@/components/ConfirmarAccion";
import { Icono } from "@/components/Icono";

export function AtajoSiri({ tieneToken, url }: { tieneToken: boolean; url: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    if (tieneToken && !confirm("El token anterior dejará de funcionar. ¿Crear uno nuevo?")) return;
    setOcupado(true);
    const r = await crearTokenAtajo();
    if (r.token) setToken(r.token);
    else setError(r.error ?? "No se pudo crear el token.");
    setOcupado(false);
  }

  async function revocar() {
    setOcupado(true);
    await revocarTokenAtajo();
    setToken(null);
    setOcupado(false);
  }

  async function copiar() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-[10px] bg-morado text-fondo">
          <Icono nombre="voz" className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-[17px] font-semibold">Atajo de Siri</h2>
          <p className="text-[13px] text-texto-2">“Oye Siri, registrar gasto”</p>
        </div>
        <span className={`text-[13px] font-semibold ${tieneToken || token ? "text-verde" : "text-texto-2"}`}>
          {tieneToken || token ? "Activo" : "Sin configurar"}
        </span>
      </div>

      {token ? (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] font-semibold text-rojo">Cópialo ahora: no se volverá a mostrar.</p>
          <code className="break-all rounded-2xl bg-fondo px-4 py-3 font-mono text-[14px]">{token}</code>
          <button type="button" onClick={copiar} className="rounded-[16px] bg-azul-relleno py-3 text-[17px] font-bold text-white">
            {copiado ? "Copiado" : "Copiar token"}
          </button>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-snug text-texto-2">
            <li>
              Abre <b>Atajos</b> › <b>+</b> y agrega <b>Solicitar entrada</b> (Número): “¿Cuánto?”.
            </li>
            <li>
              Agrega otra <b>Solicitar entrada</b> (Texto): “¿En qué?”.
            </li>
            <li>
              Agrega <b>Obtener contenido de URL</b>: <span className="break-all font-mono text-[13px]">{url}</span>, método{" "}
              <b>POST</b>.
            </li>
            <li>
              Encabezado <b>Authorization</b> = <span className="font-mono text-[13px]">Bearer</span> + espacio + tu token.
            </li>
            <li>
              Cuerpo <b>JSON</b>: <span className="font-mono text-[13px]">monto</span> = la primera entrada,{" "}
              <span className="font-mono text-[13px]">concepto</span> = la segunda.
            </li>
            <li>
              Agrega <b>Mostrar resultado</b> y llama al atajo “Registrar gasto”.
            </li>
          </ol>
        </div>
      ) : (
        <p className="text-[15px] leading-snug text-texto-2">
          Registra gastos con la voz sin abrir la app. El token es como una contraseña solo para el Atajo: si pierdes el iPhone,
          revócalo aquí.
        </p>
      )}

      {error && <p className="text-[15px] text-rojo">{error}</p>}
      <div className="flex gap-4">
        <button type="button" onClick={crear} disabled={ocupado} className="text-[15px] font-semibold text-azul disabled:opacity-60">
          {tieneToken || token ? "Crear token nuevo" : "Crear token"}
        </button>
        {(tieneToken || token) && (
          <ConfirmarAccion
            accion={revocar}
            claseBoton="text-[15px] font-semibold text-rojo"
            titulo="¿Revocar el token?"
            mensaje="El Atajo de Siri dejará de funcionar hasta que crees un token nuevo y lo pegues en el Atajo."
            confirmar="Revocar"
            confirmando="Revocando…"
          >
            Revocar
          </ConfirmarAccion>
        )}
      </div>
    </section>
  );
}
