import { Icono } from "@/components/Icono";

/**
 * Respaldo y exportación. El JSON es la copia de seguridad completa (movimientos, metas, deudas,
 * categorías y perfil) para restaurar si algo se pierde; el CSV es para abrir los movimientos en Sheets.
 */
export function Exportar() {
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-[10px] bg-verde text-fondo">
          <Icono nombre="dashboard" className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-[17px] font-semibold">Respaldo y exportación</h2>
          <p className="text-[13px] text-texto-2">Tus datos, siempre en tus manos</p>
        </div>
      </div>
      <p className="text-[15px] leading-snug text-texto-2">
        <b>Respaldo completo:</b> guárdalo una vez al mes en iCloud Drive o Google Drive (te avisamos el día 1). Sirve para
        recuperar todo si algo se borra.
      </p>
      <a
        href="/api/respaldo"
        download
        className="rounded-[16px] bg-verde py-3 text-center text-[17px] font-semibold text-fondo active:scale-[0.98]"
      >
        Descargar respaldo completo
      </a>
      <p className="text-[15px] leading-snug text-texto-2">
        <b>CSV de movimientos:</b> ábrelo en Google Sheets con <b>Archivo › Importar</b>, o desde el teléfono compártelo a
        Google Sheets (o a Numbers en iPhone).
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
