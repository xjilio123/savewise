import { alternarPrestamoCobrado, eliminarPrestamo } from "@/app/acciones";
import { FormularioPrestamo } from "@/app/(app)/me-deben/FormularioPrestamo";
import { ConfirmarAccion } from "@/components/ConfirmarAccion";
import { Icono } from "@/components/Icono";
import { Monto } from "@/components/Monto";
import { Encabezado, Pantalla, Tarjeta } from "@/components/ui";
import { formatearDinero } from "@/lib/dinero";
import { fechaCorta } from "@/lib/fechas";
import type { Prestamo } from "@/lib/supabase/tipos";

/** Me deben: préstamos que hiciste. Es una lista aparte; no cambia tus gastos ni tu sueldo. */
export function VistaMeDeben({ prestamos, moneda, hoy }: { prestamos: Prestamo[]; moneda: string; hoy: string }) {
  const pendientes = prestamos.filter((p) => !p.cobrado);
  const cobrados = prestamos.filter((p) => p.cobrado);
  const total = pendientes.reduce((s, p) => s + Math.round(p.monto * 100), 0) / 100;

  return (
    <Pantalla>
      <Encabezado
        titulo="Me deben"
        subtitulo={pendientes.length === 1 ? "1 pendiente" : `${pendientes.length} pendientes`}
        atras={{ href: "/deudas", texto: "Deudas" }}
      />

      <Tarjeta className="flex flex-col gap-1">
        <p className="text-[15px] text-texto-2">Te deben en total</p>
        <p className="text-[40px] font-extrabold leading-tight tracking-tight text-verde tabular-nums">
          <Monto texto={formatearDinero(total, moneda)} />
        </p>
        <p className="text-[13px] leading-snug text-texto-2">
          Es una lista aparte: no cambia tus gastos ni tu sueldo. Suma en tu patrimonio neto (Dashboard › Año).
        </p>
      </Tarjeta>

      {pendientes.length > 0 && (
        <ul className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
          {pendientes.map((p) => (
            <li key={p.id} className="flex flex-col gap-2.5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold">{p.persona}</p>
                  <p className="truncate text-[13px] text-texto-2">
                    {p.concepto ? `${p.concepto} · ` : ""}desde el {fechaCorta(p.fecha)}
                  </p>
                </div>
                <span className="shrink-0 text-[17px] font-semibold tabular-nums">
                  <Monto texto={formatearDinero(p.monto, p.moneda)} />
                </span>
              </div>
              <div className="flex items-center gap-4 text-[15px] font-semibold">
                <form action={alternarPrestamoCobrado.bind(null, p.id, true)}>
                  <button type="submit" className="text-verde">
                    Ya me pagó
                  </button>
                </form>
                <ConfirmarAccion
                  accion={eliminarPrestamo.bind(null, p.id)}
                  claseBoton="ml-auto text-rojo"
                  titulo={`¿Eliminar el préstamo a ${p.persona}?`}
                  mensaje="Se borra de la lista. Si ya te pagó, mejor márcalo como pagado para conservar el registro. No se puede deshacer."
                  confirmar="Eliminar"
                  confirmando="Eliminando…"
                >
                  Eliminar
                </ConfirmarAccion>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendientes.length === 0 && (
        <p className="px-1 text-center text-[15px] text-texto-2">Nadie te debe nada. Anota aquí cuando prestes dinero.</p>
      )}

      <FormularioPrestamo hoy={hoy} />

      {cobrados.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-texto-2">Ya te pagaron</h2>
          <ul className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
            {cobrados.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <Icono nombre="check" className="size-5 shrink-0 text-verde" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px]">{p.persona}</span>
                  <span className="block text-[13px] text-texto-2">
                    {p.cobrado_en ? `Pagó el ${fechaCorta(p.cobrado_en)}` : "Pagado"}
                  </span>
                </span>
                <span className="text-[15px] text-texto-2 tabular-nums">
                  <Monto texto={formatearDinero(p.monto, p.moneda)} />
                </span>
                <form action={alternarPrestamoCobrado.bind(null, p.id, false)}>
                  <button type="submit" className="text-[15px] font-semibold text-azul">
                    Deshacer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Pantalla>
  );
}
