"use client";

// Detección del entorno del navegador para la PWA. Solo se usa en componentes de cliente.

export const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
export const esAndroid = () => /Android/i.test(navigator.userAgent);

export const estaInstalada = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const soportaPush = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Convierte la clave VAPID pública (base64url) al formato que pide pushManager.subscribe. */
export function claveVapid(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const binario = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const salida = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) salida[i] = binario.charCodeAt(i);
  return salida;
}

// ---------- Cola de movimientos guardados sin conexión ----------

export type Pendiente = { id: string; datos: Record<string, string>; creado: string };
const CLAVE = "savewise:pendientes";

export function leerPendientes(): Pendiente[] {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(crudo) ? crudo : [];
  } catch {
    return [];
  }
}

export function guardarPendientes(lista: Pendiente[]) {
  try {
    if (lista.length) localStorage.setItem(CLAVE, JSON.stringify(lista));
    else localStorage.removeItem(CLAVE);
    window.dispatchEvent(new Event("savewise:pendientes"));
  } catch {
    // Sin almacenamiento disponible (modo privado): no se puede encolar.
  }
}

export function encolarMovimiento(formData: FormData): boolean {
  const datos: Record<string, string> = {};
  formData.forEach((valor, campo) => {
    if (typeof valor === "string") datos[campo] = valor;
  });
  const lista = leerPendientes();
  if (lista.length >= 50) return false;
  guardarPendientes([...lista, { id: crypto.randomUUID(), datos, creado: new Date().toISOString() }]);
  return leerPendientes().length > lista.length;
}
