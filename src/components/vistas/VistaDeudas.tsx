import Link from "next/link";
import { alternarDeudaCerrada, eliminarDeuda } from "@/app/acciones";
import { Barra } from "@/components/Anillos";
import { ConfirmarAccion } from "@/components/ConfirmarAccion";
import { Encabezado, Pantalla, Tarjeta } from "@/components/ui";
import type { DeudaConPagos } from "@/lib/datos/repositorio";
import { formatearDinero, fraccion } from "@/lib/dinero";
import { planDeuda, saldoDeuda } from "@/lib/deudas";
import { FormularioDeuda } from "@/app/(app)/deudas/FormularioDeuda";
import { ConMontos, Monto } from "@/components/Monto";

const tipos = { tarjeta: "Tarjeta", prestamo: "Préstamo", otro: "Deuda" } as const;

function textoPlazo(meses: number | null, sinFin: boolean): string | null {
  if (sinFin) return "La cuota no cubre los intereses: la deuda no baja";
  if (meses === null) return null;
  if (meses === 0) return "Pagada";
  if (meses === 1) return "Te falta 1 cuota aprox.";
  const anios = meses > 24 ? ` (unos ${Math.round(meses / 12)} años: subir la cuota ahorra intereses)` : "";
  return `Te faltan ${meses} cuotas aprox.${anios}`;
}

export function VistaDeudas({ deudas, moneda }: { deudas: DeudaConPagos[]; moneda: string }) {
  const dinero = (n: number) => formatearDinero(n, moneda);

  const abiertas = deudas.filter((d) => !d.cerrada);
  const cerradas = deudas.filter((d) => d.cerrada);
  const saldos = new Map(deudas.map((d) => [d.id, saldoDeuda(d.monto_total, d.pagado)]));
  const totalDebido = abiertas.reduce((s, d) => s + Math.round((saldos.get(d.id) ?? 0) * 100), 0) / 100;
  const cuotasDelMes = abiertas.reduce((s, d) => s + Math.round((d.cuota_mensual ?? 0) * 100), 0) / 100;

  return (
    <Pantalla>
      <Encabezado
        titulo="Deudas"
        subtitulo={abiertas.length === 1 ? "1 deuda activa" : `${abiertas.length} deudas activas`}
        atras={{ href: "/ahorros", texto: "Ahorros" }}
        accion={
          <Link href="/me-deben" className="text-[17px] font-semibold text-azul">
            Me deben ›
          </Link>
        }
      />

      <Tarjeta className="flex flex-col gap-1">
        <p className="text-[15px] text-texto-2">Debes en total (aprox.)</p>
        <p className="text-[40px] font-extrabold leading-tight tracking-tight tabular-nums"><Monto texto={dinero(totalDebido)} /></p>
        {cuotasDelMes > 0 && (
          <p className="text-[15px] text-texto-2">
            Cuotas al mes: <span className="font-semibold text-rojo"><Monto texto={dinero(cuotasDelMes)} /></span>
          </p>
        )}
      </Tarjeta>

      {abiertas.map((d) => {
        const saldo = saldos.get(d.id) ?? 0;
        const plan = planDeuda(saldo, d.cuota_mensual, d.tea);
        const plazo = textoPlazo(plan.meses, plan.sinFin);
        const detalles = [
          tipos[d.tipo],
          d.cuota_mensual ? `cuota ${dinero(d.cuota_mensual)}` : null,
          d.dia_pago ? `paga el ${d.dia_pago}` : null,
          d.tea !== null ? `TEA ${d.tea}%` : null,
        ].filter(Boolean);
        return (
          <Tarjeta key={d.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[17px] font-bold">{d.nombre}</p>
                <p className="text-[13px] text-texto-2"><ConMontos texto={detalles.join(" · ")} /></p>
              </div>
              <Link
                href={`/agregar?tipo=GASTO&deuda=${d.id}`}
                className="shrink-0 rounded-full bg-rojo-relleno/15 px-4 py-2 text-[15px] font-semibold text-rojo"
              >
                Pagar cuota
              </Link>
            </div>
            <Barra fraccion={fraccion(d.pagado, d.monto_total)} clase="text-verde" />
            <p className="text-[15px] tabular-nums">
              Pagado <Monto texto={dinero(d.pagado)} /> de <Monto texto={dinero(d.monto_total)} /> · <b>falta <Monto texto={dinero(saldo)} /></b>
            </p>
            {plazo && <p className={`text-[13px] ${plan.sinFin ? "text-rojo" : "text-texto-2"}`}>{plazo}</p>}
            <div className="flex gap-4 text-[15px] font-semibold">
              <form action={alternarDeudaCerrada.bind(null, d.id, true)}>
                <button type="submit" className="text-verde">
                  Marcar como pagada
                </button>
              </form>
              <Link href={`/deudas/${d.id}`} className="text-azul">
                Editar
              </Link>
              <ConfirmarAccion
                accion={eliminarDeuda.bind(null, d.id)}
                claseBoton="ml-auto text-rojo"
                titulo={`¿Eliminar «${d.nombre}»?`}
                mensaje="La deuda desaparece, pero sus pagos se quedan en tu historial como gastos normales. No se puede deshacer."
                confirmar="Eliminar deuda"
                confirmando="Eliminando…"
              >
                Eliminar
              </ConfirmarAccion>
            </div>
          </Tarjeta>
        );
      })}

      {abiertas.length === 0 && (
        <p className="px-1 text-center text-[15px] text-texto-2">
          Sin deudas activas. Registra tus tarjetas o préstamos para ver cuánto te falta y recibir avisos de pago.
        </p>
      )}

      <FormularioDeuda />

      {cerradas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-texto-2">Pagadas</h2>
          <div className="divide-y divide-linea rounded-[22px] bg-tarjeta px-4">
            {cerradas.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-3.5">
                <p className="min-w-0 truncate text-[17px]">{d.nombre}</p>
                <form action={alternarDeudaCerrada.bind(null, d.id, false)}>
                  <button type="submit" className="text-[15px] font-semibold text-azul">
                    Reabrir
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="px-1 text-[13px] leading-snug text-texto-2">
        El saldo es aproximado: lo que debías menos lo que registraste como pago. Los intereses solo se usan para estimar las
        cuotas que faltan.
      </p>
    </Pantalla>
  );
}
