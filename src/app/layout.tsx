import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { RegistrarServiceWorker } from "@/components/pwa/RegistrarServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaveWise",
  description: "Cada sol con un propósito.",
  applicationName: "SaveWise",
  appleWebApp: { capable: true, title: "SaveWise", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // La CSP usa un nonce por request: todas las páginas se renderizan en cada visita.
  await connection();

  return (
    <html lang="es-PE" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
