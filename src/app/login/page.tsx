import { Anillos } from "@/components/Anillos";
import { BotonGoogle } from "./BotonGoogle";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-[max(env(safe-area-inset-top),48px)] pb-[max(env(safe-area-inset-bottom),32px)]">
      {/* Logo y textos centrados en el espacio libre; el botón queda abajo, al alcance del pulgar. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <Anillos
          etiqueta="Logo de SaveWise: tres anillos de colores"
          anillos={[
            { fraccion: 0.78, clase: "text-rojo-relleno" },
            { fraccion: 0.62, clase: "text-verde-relleno" },
            { fraccion: 0.86, clase: "text-morado-relleno" },
          ]}
        />
        <div className="flex flex-col items-center gap-3">
          <h1 className="bg-gradient-to-r from-rojo-relleno via-morado-relleno to-azul-relleno bg-clip-text text-[56px] font-extrabold leading-none tracking-tighter text-transparent">
            SaveWise
          </h1>
          <p className="text-[22px] font-semibold tracking-tight">Cada sol con un propósito.</p>
          <p className="max-w-80 text-[17px] leading-relaxed text-texto-2">
            Reparte tu sueldo en gastos, ahorros y “Para mí”, y mira siempre cuánto queda sin asignar.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-2xl bg-rojo-relleno/12 px-4 py-3 text-[15px] font-medium text-rojo">
            No se pudo iniciar sesión. Esta app es privada: solo pueden entrar cuentas autorizadas.
          </p>
        )}
        <BotonGoogle />
        <p className="text-center text-[13px] text-texto-2">App personal. Tus datos solo los ves tú.</p>
      </div>
    </main>
  );
}
