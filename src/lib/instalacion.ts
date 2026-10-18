"use client";

// Instalación en Android: Chrome avisa con "beforeinstallprompt" que la app se puede instalar.
// Se guarda ese evento (llega una vez por carga, a veces antes de que exista el aviso en
// pantalla) para mostrar un botón "Instalar" propio. En iPhone no existe: allí se explica a mano.

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export const EVENTO_INSTALAR = "savewise:aviso-instalar";
let pendiente: EventoInstalar | null = null;

/** Empieza a escuchar; devuelve la función para dejar de hacerlo (limpieza del efecto). */
export function escucharInstalacion(): () => void {
  const alOfrecer = (e: Event) => {
    e.preventDefault(); // la app muestra su propio aviso en lugar de la barra de Chrome
    pendiente = e as EventoInstalar;
    window.dispatchEvent(new Event(EVENTO_INSTALAR));
  };
  const alInstalar = () => {
    pendiente = null;
    window.dispatchEvent(new Event(EVENTO_INSTALAR));
  };
  window.addEventListener("beforeinstallprompt", alOfrecer);
  window.addEventListener("appinstalled", alInstalar);
  return () => {
    window.removeEventListener("beforeinstallprompt", alOfrecer);
    window.removeEventListener("appinstalled", alInstalar);
  };
}

export const puedeInstalar = () => pendiente !== null;

/** Abre el diálogo nativo de Chrome. Devuelve true si se instaló. */
export async function instalar(): Promise<boolean> {
  if (!pendiente) return false;
  const evento = pendiente;
  pendiente = null;
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  window.dispatchEvent(new Event(EVENTO_INSTALAR));
  return outcome === "accepted";
}
