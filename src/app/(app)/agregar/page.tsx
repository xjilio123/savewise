import Link from "next/link";
import { Alerta, Encabezado, Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { calcularResumen, formatearDinero } from "@/lib/dinero";
import { hoyLima, periodoFinanciero, sumarDias } from "@/lib/fechas";
import { gastosFrecuentes } from "@/lib/ideas";
import { requerirSesion } from "@/lib/supabase/servidor";
import { TIPOS_FORMULARIO } from "@/lib/validacion";
import { FormularioMovimiento, type ValoresMovimiento } from "./FormularioMovimiento";
import { Monto } from "@/components/Monto";

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const MONTO_VALIDO = /^\d{1,9}(\.\d{1,2})?$/;

export default async function Agregar({ searchParams }: PageProps<"/agregar">) {
  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const hoy = hoyLima();
  const [perfil, categorias, metas, deudas, recientes, params] = await Promise.all([
    repo.perfil(),
    repo.categorias(),
    repo.metas(),
    repo.deudas(),
    repo.movimientosEntre(sumarDias(hoy, -60), hoy),
    searchParams,
  ]);
  const abiertas = deudas.filter((d) => !d.cerrada);
  const frecuentes = gastosFrecuentes(recientes);
  // Para el aviso basta lo registrado hasta hoy; al guardar, el servidor revisa el periodo completo.
  const periodo = periodoFinanciero(hoy, perfil.dia_pago);
  const { sinAsignar } = calcularResumen(
    perfil.sueldo_mensual,
    recientes.filter((m) => m.fecha >= periodo.desde),
  );

  // Los parámetros de la URL solo precargan el formulario: cada uno se valida y el servidor
  // vuelve a validar todo al guardar. Las opciones (meta, categoría, deuda) deben existir.
  const tipoPedido = texto(params.tipo);
  const tipo = (TIPOS_FORMULARIO as readonly string[]).includes(tipoPedido) ? tipoPedido : "GASTO";
  const metaId = metas.find((m) => m.id === params.meta)?.id ?? "";
  const categoriaId = categorias.find((c) => c.id === params.categoria)?.id ?? "";
  const concepto = texto(params.concepto).trim().slice(0, 80);
  const monto = MONTO_VALIDO.test(texto(params.monto)) ? texto(params.monto) : undefined;
  // "Pagar cuota" desde Deudas: gasto vinculado, con el nombre y la cuota ya puestos.
  const deuda = abiertas.find((d) => d.id === params.deuda);

  const inicial: Partial<ValoresMovimiento> = deuda
    ? { tipo: "GASTO", deuda_id: deuda.id, concepto: `Pago ${deuda.nombre}`.slice(0, 80), monto: deuda.cuota_mensual?.toFixed(2) }
    : { tipo, meta_id: metaId, categoria_id: categoriaId, concepto: concepto || undefined, monto };

  return (
    <Pantalla>
      <Encabezado titulo="Nuevo movimiento" atras={{ href: "/", texto: "Inicio" }} />

      {sinAsignar <= 0 && (
        <Alerta texto="No tienes dinero sin asignar: por ahora no puedes registrar gastos ni ahorros. Sí puedes registrar un ingreso o un gasto de tu bolsa Para mí." />
      )}

      {frecuentes.length > 0 && !deuda && (
        <nav aria-label="Gastos frecuentes" className="flex flex-col gap-2">
          <p className="px-1 text-[13px] font-semibold uppercase tracking-wide text-texto-2">Frecuentes</p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {frecuentes.map((f) => {
              const destino = new URLSearchParams({ tipo: f.tipo, concepto: f.concepto, monto: f.monto.toFixed(2) });
              if (f.categoria_id) destino.set("categoria", f.categoria_id);
              return (
                <Link
                  key={`${f.tipo}-${f.concepto}-${f.monto}`}
                  href={`/agregar?${destino}`}
                  replace
                  scroll={false}
                  className="flex shrink-0 flex-col rounded-2xl bg-tarjeta px-4 py-2.5 active:scale-[0.97]"
                >
                  <span className="max-w-36 truncate text-[15px] font-semibold">{f.concepto}</span>
                  <span className="text-[13px] text-texto-2 tabular-nums"><Monto texto={formatearDinero(f.monto, f.moneda)} /></span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <FormularioMovimiento
        // La clave cambia con los datos precargados: tocar otro frecuente reinicia el formulario.
        key={JSON.stringify(inicial)}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        metas={metas.map((m) => ({ id: m.id, nombre: m.nombre }))}
        deudas={abiertas.map((d) => ({ id: d.id, nombre: d.nombre }))}
        hoy={hoy}
        monedaBase={perfil.moneda_base}
        inicial={inicial}
      />
    </Pantalla>
  );
}
