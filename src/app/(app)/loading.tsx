// Esqueleto que aparece al instante al tocar una pestaña, mientras llegan los datos.
export default function Cargando() {
  const bloque = "rounded-[28px] bg-tarjeta motion-safe:animate-pulse";
  return (
    <main
      aria-busy="true"
      aria-label="Cargando"
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-36"
    >
      <div className="flex flex-col gap-2 pt-2">
        <div className="h-4 w-32 rounded-full bg-control motion-safe:animate-pulse" />
        <div className="h-9 w-44 rounded-full bg-control motion-safe:animate-pulse" />
      </div>
      <div className={`h-36 ${bloque}`} />
      <div className={`h-48 ${bloque}`} />
      <div className={`h-20 ${bloque}`} />
      <div className={`h-20 ${bloque}`} />
    </main>
  );
}
