// Tema de la app: automático (sigue al iPhone), claro u oscuro. Se guarda en una cookie
// que lee el servidor, así la página llega pintada con el tema correcto, sin parpadeo ni scripts.

export const TEMAS = ["auto", "claro", "oscuro"] as const;
export type Tema = (typeof TEMAS)[number];
export const COOKIE_TEMA = "tema";
/** "1" = montos ocultos. Solo lo lee el servidor para pintar la página ya oculta. */
export const COOKIE_PRIVADO = "privado";

/** Cualquier valor desconocido o manipulado vuelve a "auto". */
export function leerTema(valor: string | undefined): Tema {
  return (TEMAS as readonly string[]).includes(valor ?? "") ? (valor as Tema) : "auto";
}

const FONDO = { claro: "#f2f2f7", oscuro: "#000000" } as const;

/** Color de la barra del sistema para cada tema. */
export function coloresDeTema(tema: Tema): { media?: string; color: string }[] {
  if (tema === "auto") {
    return [
      { media: "(prefers-color-scheme: light)", color: FONDO.claro },
      { media: "(prefers-color-scheme: dark)", color: FONDO.oscuro },
    ];
  }
  return [{ color: FONDO[tema] }];
}
