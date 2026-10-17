"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sincronizarMovimiento } from "@/app/acciones";
import { guardarPendientes, leerPendientes } from "@/lib/dispositivo";

const suscribirConexion = (avisar: () => void) => {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
};

const suscribirPendientes = (avisar: () => void) => {
  window.addEventListener("savewise:pendientes", avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener("savewise:pendientes", avisar);
    window.removeEventListener("storage", avisar);
  };
};

/**
 * Muestra "Sin conexión" y envía los movimientos que se guardaron en el iPhone sin internet
 * en cuanto vuelve la conexión.
 */
export function EstadoConexion() {
  const router = useRouter();
  const enLinea = useSyncExternalStore(suscribirConexion, () => navigator.onLine, () => true);
  const pendientes = useSyncExternalStore(suscribirPendientes, () => leerPendientes().length, () => 0);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const sincronizando = useRef(false);

  const sincronizar = useCallback(async () => {
    if (sincronizando.current || !navigator.onLine) return;
    const lista = leerPendientes();
    if (!lista.length) return;
    sincronizando.current = true;
    let enviados = 0;
    let descartados = 0;
    const quedan = [];
    for (const p of lista) {
      try {
        const resultado = await sincronizarMovimiento(p.id, p.datos);
        if (resultado.ok) enviados++;
        else if (resultado.errores) descartados++;
        else quedan.push(p);
      } catch {
        quedan.push(p);
      }
    }
    guardarPendientes(quedan);
    sincronizando.current = false;
    if (enviados || descartados) {
      setMensaje(
        `${enviados} ${enviados === 1 ? "movimiento enviado" : "movimientos enviados"}` +
          (descartados ? ` · ${descartados} con datos inválidos` : ""),
      );
      router.refresh();
    }
  }, [router]);

  // Se sincroniza al volver la conexión, al encolar algo nuevo y una vez al abrir la app.
  useEffect(() => {
    const intentar = () => void sincronizar();
    window.addEventListener("online", intentar);
    window.addEventListener("savewise:pendientes", intentar);
    const inicial = setTimeout(intentar, 0);
    return () => {
      window.removeEventListener("online", intentar);
      window.removeEventListener("savewise:pendientes", intentar);
      clearTimeout(inicial);
    };
  }, [sincronizar]);

  // Al volver a la app después de un rato, trae datos frescos (por ejemplo, un gasto registrado con Siri).
  useEffect(() => {
    let oculta = 0;
    const alCambiar = () => {
      if (document.visibilityState === "hidden") oculta = Date.now();
      else if (oculta && Date.now() - oculta > 60_000) router.refresh();
    };
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, [router]);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 4000);
    return () => clearTimeout(t);
  }, [mensaje]);

  const texto = !enLinea
    ? pendientes
      ? `Sin conexión · ${pendientes} por enviar`
      : "Sin conexión"
    : mensaje;
  if (!texto) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-[max(env(safe-area-inset-top),8px)] z-30 mx-auto w-fit rounded-full bg-texto px-4 py-2 text-[15px] font-semibold text-fondo shadow-lg"
    >
      {texto}
    </div>
  );
}
