import { Icono } from "@/components/Icono";

/** Descarga todos los movimientos en CSV. En el iPhone se abre la hoja para guardarlo o enviarlo a Sheets. */
export function Exportar() {
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-[10px] bg-verde text-white">
          <Icono nombre="dashboard" className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-[17px] font-semibold">Exportar mis datos</h2>
          <p className="text-[13px] text-texto-2">Todos tus movimientos en un archivo CSV</p>
        </div>
      </div>
      <p className="text-[15px] leading-snug text-texto-2">
        Ábrelo en Google Sheets con <b>Archivo › Importar</b>, o en el iPhone compártelo a la app de Sheets o Numbers.
      </p>
      <a
        href="/api/exportar"
        download
        className="rounded-[16px] bg-fondo py-3 text-center text-[17px] font-semibold text-azul active:scale-[0.98]"
      >
        Descargar CSV
      </a>
    </section>
  );
}
