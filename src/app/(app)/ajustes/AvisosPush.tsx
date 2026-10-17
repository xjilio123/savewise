"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { enviarAvisoPrueba, guardarSuscripcion, quitarSuscripcion } from "@/app/acciones";
import { Icono } from "@/components/Icono";
import { claveVapid, esIOS, estaInstalada, soportaPush } from "@/lib/dispositivo";

type Soporte = "cargando" | "listo" | "instalar-primero" | "no-soporta";

const nada = () => () => {};
function leerSoporte(): Soporte {
  if (soportaPush()) return "listo";
  return esIOS() && !estaInstalada() ? "instalar-primero" : "no-soporta";
}

export function AvisosPush() {
  const soporte = useSyncExternalStore<Soporte>(nada, leerSoporte, () => "cargando");
  const [activo, setActivo] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (soporte !== "listo") return;
    navigator.serviceWorker.ready
      .then((r) => r.pushManager.getSubscription())
      .then((s) => setActivo(Boolean(s)))
      .catch(() => setActivo(false));
  }, [soporte]);

  async function activar() {
    setOcupado(true);
    setMensaje(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setMensaje("Sin permiso. Puedes activarlo en Ajustes del iPhone › Notificaciones › SaveWise.");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveVapid(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
      });
      const r = await guardarSuscripcion(suscripcion.toJSON());
      if (r.error) {
        await suscripcion.unsubscribe();
        setMensaje(r.error);
      } else setActivo(true);
    } catch {
      setMensaje("No se pudieron activar los avisos en este dispositivo.");
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    const registro = await navigator.serviceWorker.ready;
    const suscripcion = await registro.pushManager.getSubscription();
    if (suscripcion) {
      await quitarSuscripcion(suscripcion.endpoint);
      await suscripcion.unsubscribe();
    }
    setActivo(false);
    setOcupado(false);
  }

  async function probar() {
    setOcupado(true);
    const r = await enviarAvisoPrueba();
    setMensaje(r.ok ? "Aviso de prueba enviado." : (r.error ?? "No se pudo enviar."));
    setOcupado(false);
  }

  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-[10px] bg-rojo text-white">
          <Icono nombre="campana" className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-[17px] font-semibold">Avisos</h2>
          <p className="text-[13px] text-texto-2">Renovaciones 3 días antes y el día que cobras</p>
        </div>
        {soporte === "listo" && activo !== null && (
          <button
            type="button"
            role="switch"
            aria-checked={activo}
            aria-label="Avisos"
            disabled={ocupado}
            onClick={activo ? desactivar : activar}
            className={`flex h-[31px] w-[51px] items-center rounded-full p-0.5 transition disabled:opacity-60 ${
              activo ? "justify-end bg-verde-relleno" : "bg-control"
            }`}
          >
            <span className="size-[27px] rounded-full bg-white shadow" />
          </button>
        )}
      </div>
      {soporte === "instalar-primero" && (
        <p className="text-[15px] text-texto-2">
          En iPhone los avisos solo funcionan con SaveWise instalada: Compartir › Añadir a pantalla de inicio.
        </p>
      )}
      {soporte === "no-soporta" && <p className="text-[15px] text-texto-2">Este navegador no admite avisos.</p>}
      {activo && (
        <button type="button" onClick={probar} disabled={ocupado} className="w-fit text-[15px] font-semibold text-azul">
          Enviar aviso de prueba
        </button>
      )}
      {mensaje && (
        <p role="status" className="text-[15px] text-texto-2">
          {mensaje}
        </p>
      )}
    </section>
  );
}
