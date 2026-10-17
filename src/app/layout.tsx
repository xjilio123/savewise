import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { RegistrarServiceWorker } from "@/components/pwa/RegistrarServiceWorker";
import { COOKIE_PRIVADO, COOKIE_TEMA, coloresDeTema, leerTema } from "@/lib/tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaveWise",
  description: "Cada sol con un propósito.",
  applicationName: "SaveWise",
  // "default": la hora y la batería del iPhone cambian de color con el tema.
  // "black-translucent" las dejaba siempre blancas, ilegibles en modo claro.
  appleWebApp: { capable: true, title: "SaveWise", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export async function generateViewport(): Promise<Viewport> {
  const tema = leerTema((await cookies()).get(COOKIE_TEMA)?.value);
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: coloresDeTema(tema),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // La CSP usa un nonce por request: todas las páginas se renderizan en cada visita.
  await connection();
  const galletas = await cookies();
  const tema = leerTema(galletas.get(COOKIE_TEMA)?.value);
  const privado = galletas.get(COOKIE_PRIVADO)?.value === "1";

  return (
    <html
      lang="es-PE"
      className="h-full antialiased"
      data-tema={tema === "auto" ? undefined : tema}
      data-privado={privado ? "" : undefined}
    >
      <body className="min-h-full">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
