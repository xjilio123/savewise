import Link from "next/link";
import { dejarDeRepetir, eliminarMovimiento, quitarCambioProximoPago } from "@/app/acciones";
import { ConfirmarAccion } from "@/components/ConfirmarAccion";
import { FormularioProximoPago } from "@/components/FormularioProximoPago";
import { Icono } from "@/components/Icono";
import { Monto } from "@/components/Monto";
import { formatearDinero } from "@/lib/dinero";
import { fechaCorta, sumarDias } from "@/lib/fechas";
import type { PagoCalendario } from "@/lib/ideas";
import type { TipoMovimiento } from "@/lib/supabase/tipos";

const ETIQUETA: Record<TipoMovimiento, string> = {
  GASTO: "Gasto fijo",
  OCIO: "Para mí",
  AHORRO: "Ahorro",
  INGRESO: "Ingreso",
  PARA_MI: "Bolsa Para mí",
};

function etiqueta(p: PagoCalendario): string {
  const tipo = p.tipo ? ETIQUETA[p.tipo] : "Cuota de deuda";
  const estado = p.pagado ? (p.tipo === "INGRESO" ? "recibido" : "pagado") : "pendiente";
  return `${tipo} · ${estado}${p.editado ? " · editado" : ""}`;
}

/**
 * Lo que se repite cada mes y las cuotas de deudas del periodo. Tocar una fila muestra sus
 * acciones: editar (el registro pagado, o el precio y la fecha del próximo pago), dejar de repetir
 * (servicio cancelado), eliminar el registro de este mes o ver la deuda.
 */
export function CalendarioPagos({ pagos }: { pagos: PagoCalendario[] }) {
  const pendientes = pagos.filter((p) => !p.pagado).length;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-texto-2">
        Calendario de pagos{pendientes > 0 ? ` · ${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : ""}
      </h2>
      <ul className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
        {pagos.map((p) => (
          <li key={`${p.origen}-${p.concepto}-${p.fecha}`}>
            <details className="group py-3">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className={`w-14 shrink-0 text-[15px] font-semibold ${p.pagado ? "text-texto-2" : "text-texto"}`}>
                  {fechaCorta(p.fecha)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[17px] ${p.pagado ? "text-texto-2 line-through" : ""}`}>{p.concepto}</span>
                  <span className="block text-[13px] text-texto-2">{etiqueta(p)}</span>
                </span>
                {p.monto !== null && (
                  <span className={`shrink-0 text-[17px] font-semibold tabular-nums ${p.pagado ? "text-texto-2" : ""}`}>
                    <Monto texto={formatearDinero(p.monto, p.moneda)} />
                  </span>
                )}
                <Icono nombre="atras" className="size-4 shrink-0 -rotate-90 text-texto-2 transition group-open:rotate-90" />
              </summary>

              {p.origen === "deuda" ? (
                <Link
                  href="/deudas"
                  className="mt-3 block rounded-[14px] bg-fondo py-2.5 text-center text-[15px] font-semibold text-azul"
                >
                  Ver deuda (pagar, cerrar o eliminar)
                </Link>
              ) : (
                p.movimientoId && (
                  <div className="mt-3 flex flex-col gap-2">
                    {p.pagado ? (
                      <p className="px-1 text-[13px] leading-snug text-texto-2">
                        Editar cambia este registro, y los próximos meses se registran con sus datos.
                      </p>
                    ) : (
                      <>
                        <FormularioProximoPago
                          id={p.movimientoId}
                          monto={p.monto ?? 0}
                          fecha={p.fecha}
                          moneda={p.moneda}
                          despuesDe={sumarDias(p.ultimoPago ?? p.fecha, 1)}
                        />
                        {p.editado && (
                          <form action={quitarCambioProximoPago.bind(null, p.movimientoId)}>
                            <button type="submit" className="w-full py-1.5 text-[15px] font-semibold text-azul">
                              Quitar el cambio (volver al precio y la fecha de siempre)
                            </button>
                          </form>
                        )}
                      </>
                    )}
                    <p className="px-1 text-[13px] leading-snug text-texto-2">
                      ¿Lo cancelaste o cambiaste de servicio? Deja de repetirlo: ya no se registrará solo ni te avisará. Tu
                      historial se mantiene.
                    </p>
                    <div className={`grid gap-2 ${p.pagado ? "grid-cols-2" : "grid-cols-1"}`}>
                      {p.pagado && (
                        <Link
                          href={`/historial/${p.movimientoId}`}
                          className="flex items-center justify-center rounded-[14px] bg-fondo py-2.5 text-[15px] font-semibold text-azul"
                        >
                          Editar
                        </Link>
                      )}
                      <ConfirmarAccion
                        accion={dejarDeRepetir.bind(null, p.movimientoId)}
                        claseBoton="w-full rounded-[14px] bg-fondo py-2.5 text-[15px] font-semibold text-rojo"
                        titulo={`¿Dejar de repetir «${p.concepto}»?`}
                        mensaje="Ya no se registrará solo cada mes ni te avisará. Lo que ya registraste se mantiene en tu historial."
                        confirmar="Dejar de repetir"
                        confirmando="Guardando…"
                      >
                        Dejar de repetir
                      </ConfirmarAccion>
                    </div>
                    {p.pagado && (
                      <ConfirmarAccion
                        accion={eliminarMovimiento.bind(null, p.movimientoId, "/dashboard")}
                        claseBoton="flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-rojo py-2.5 text-[15px] font-semibold text-fondo"
                        titulo="¿Eliminar este registro?"
                        mensaje={`Se borrará «${p.concepto}» del ${fechaCorta(p.fecha)}. No se puede deshacer.`}
                        confirmar="Eliminar"
                        confirmando="Eliminando…"
                      >
                        <Icono nombre="basura" className="size-4" />
                        Eliminar registro
                      </ConfirmarAccion>
                    )}
                  </div>
                )
              )}
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
