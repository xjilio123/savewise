"use client";

import { useEffect } from "react";
import { escucharInstalacion } from "@/lib/instalacion";

/**
 * Registra el service worker en producción (en desarrollo complicaría la recarga en caliente)
 * y empieza a escuchar el aviso de instalación de Android desde la primera pantalla.
 */
export function RegistrarServiceWorker() {
  useEffect(() => escucharInstalacion(), []);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sin service worker la app funciona igual, solo sin modo offline ni avisos.
    });
  }, []);
  return null;
}
