import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraPestanas } from "@/components/BarraPestanas";
import { ListaAportes } from "@/app/(app)/ahorros/ListaAportes";
import { actualizarDeuda, actualizarMeta, crearCategoria } from "@/app/acciones";
import { Exportar } from "@/app/(app)/ajustes/Exportar";
import { FormularioCategoria } from "@/app/(app)/categorias/FormularioCategoria";
import { FormularioEditarMeta } from "@/app/(app)/ahorros/[id]/FormularioEditarMeta";
import { BorrarDatos } from "@/app/(app)/ajustes/BorrarDatos";
import { FormularioDeuda } from "@/app/(app)/deudas/FormularioDeuda";
import { SelectorTema } from "@/app/(app)/ajustes/SelectorTema";
import { ResumenIA } from "@/app/(app)/dashboard/ResumenIA";
import { BotonPrivado } from "@/components/BotonPrivado";
import { CierreMes } from "@/components/CierreMes";
import { VistaDashboard } from "@/components/vistas/VistaDashboard";
import { VistaDeudas } from "@/components/vistas/VistaDeudas";
import { VistaMeDeben } from "@/components/vistas/VistaMeDeben";
import { VistaHistorial } from "@/components/vistas/VistaHistorial";
import { VistaInicio } from "@/components/vistas/VistaInicio";
import { VistaParaMi } from "@/components/vistas/VistaParaMi";
import { generarConsejos } from "@/lib/consejos";
import { calcularResumen } from "@/lib/dinero";
import { periodoFinanciero } from "@/lib/fechas";
import * as f from "./datos";

// Vitrina de pantallas con datos FICTICIOS para revisar el diseño sin tocar cuentas reales.
// No existe en producción: responde 404 y el proxy no la deja pasar.
export default async function Vitrina({ searchParams }: PageProps<"/vitrina">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { p } = await searchParams;

  const periodo = periodoFinanciero(f.HOY, 1);
  const resumen = calcularResumen(1500, f.MOVIMIENTOS);
  const consejos = generarConsejos(resumen, periodo);

  const pantallas: Record<string, React.ReactNode> = {
    inicio: (
      <VistaInicio
        fecha="Sábado 17 de octubre"
        periodo="1 oct – 31 oct"
        inicial="J"
        moneda="PEN"
        resumen={resumen}
        consejo={consejos[0] ?? null}
        sinMovimientos={false}
        privado={<BotonPrivado grande />}
        extra={
          <CierreMes
            clave="vitrina"
            periodo="1 sept – 30 sept"
            sobrante="S/ 351.88"
            metas={[
              { id: "00000000-0000-0000-0000-000000000001", nombre: "Navidad" },
              { id: "00000000-0000-0000-0000-000000000002", nombre: "Fondo de emergencia" },
            ]}
          />
        }
      />
    ),
    "para-mi": (
      <VistaParaMi
        moneda="PEN"
        resumen={resumen}
        periodo={periodo}
        etiquetaPeriodo="1 oct – 31 oct"
        hoy={f.HOY}
        ultimos={f.FILAS.filter((m) => m.tipo === "OCIO").map((m) => ({ id: m.id, concepto: m.concepto, fecha: m.fecha, monto: m.monto }))}
      />
    ),
    historial: (
      <VistaHistorial
        filtros={{ desde: "2026-10-01", hasta: "2026-10-31", pagina: 1 }}
        filas={f.FILAS}
        cantidad={46}
        totales={{ INGRESO: 0, GASTO: 598.12, AHORRO: 300, PARA_MI: 250, OCIO: 103.5 }}
        categorias={f.CATEGORIAS}
        rangos={{
          periodo: { desde: "2026-10-01", hasta: "2026-10-31" },
          anterior: { desde: "2026-09-01", hasta: "2026-09-30" },
          tresPeriodos: { desde: "2026-08-01", hasta: "2026-10-31" },
        }}
        moneda="PEN"
        hoy={f.HOY}
      />
    ),
    dashboard: (
      <VistaDashboard
        vista="mes"
        moneda="PEN"
        etiquetaPeriodo="1 oct – 31 oct"
        categorias={f.POR_CATEGORIA}
        resumen={resumen}
        consejos={consejos}
        meses={f.MESES}
        pagos={f.PAGOS}
        hormiga={f.HORMIGA}
        extra={<ResumenIA />}
      />
    ),
    deudas: <VistaDeudas deudas={f.DEUDAS} moneda="PEN" />,
    piezas: (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-7 pb-36">
        <SelectorTema actual="auto" />
        <ListaAportes aportes={f.APORTES} />
        <FormularioCategoria
          accion={crearCategoria}
          ocupados={["rojo", "naranja", "verde", "turquesa", "azul", "indigo", "morado", "rosa", "negro"]}
          textoBoton="Crear categoría"
        />
        <Exportar />
        <BorrarDatos />
        <FormularioEditarMeta
          accion={actualizarMeta.bind(null, "vitrina")}
          inicial={{ nombre: "Navidad", objetivo: "800.00", fecha_objetivo: "2026-12-20" }}
        />
        <FormularioDeuda
          accion={actualizarDeuda.bind(null, "vitrina")}
          inicial={{ nombre: "Visa", tipo: "tarjeta", monto_total: "2500.00", cuota_mensual: "250.00", dia_pago: "5", tea: "65" }}
        />
      </main>
    ),
    anio: (
      <VistaDashboard
        vista="anio"
        moneda="PEN"
        etiquetaPeriodo="1 oct – 31 oct"
        categorias={f.POR_CATEGORIA}
        resumen={resumen}
        consejos={[]}
        meses={f.MESES}
        patrimonio={f.PATRIMONIO}
      />
    ),
    "me-deben": <VistaMeDeben prestamos={f.PRESTAMOS} moneda="PEN" hoy={f.HOY} />,
  };

  const pantalla = typeof p === "string" ? pantallas[p] : undefined;
  if (!pantalla) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-3 p-6">
        <h1 className="text-[28px] font-bold">Vitrina (datos ficticios)</h1>
        {Object.keys(pantallas).map((nombre) => (
          <Link key={nombre} href={`/vitrina?p=${nombre}`} className="rounded-2xl bg-tarjeta px-4 py-3 text-azul">
            {nombre}
          </Link>
        ))}
      </main>
    );
  }

  return (
    <>
      {pantalla}
      <BarraPestanas />
    </>
  );
}
