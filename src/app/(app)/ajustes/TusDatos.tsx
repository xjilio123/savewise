import { Barra } from "@/components/Anillos";
import { BotonRespaldo } from "@/components/BotonRespaldo";
import { Icono } from "@/components/Icono";
import { Alerta } from "@/components/ui";
import {
  avisoRespaldo,
  COLOR_NIVEL,
  CUPO_PERSONA,
  type DatosEspacio,
  diasDesdeRespaldo,
  estadoEspacio,
  textoConteos,
  textoUltimoRespaldo,
} from "@/lib/espacio";
import { RestaurarRespaldo } from "./RestaurarRespaldo";

/**
 * Tus datos: cuánto espacio usas, tu último respaldo, y respaldo, restauración y CSV.
 * El JSON es la copia de seguridad completa para restaurar si algo se pierde; el CSV es para abrir
 * los movimientos en Sheets. Si no se pudo medir el espacio, la sección se muestra sin esa parte.
 */
export function TusDatos({ espacio, ahora }: { espacio: DatosEspacio | null; ahora?: Date }) {
  const estado = espacio ? estadoEspacio(espacio.bytes, CUPO_PERSONA) : null;
  const dias = espacio ? diasDesdeRespaldo(espacio.ultimoRespaldo, ahora) : null;
  // Si el espacio ya pide un respaldo, no se repite el aviso de la fecha.
  const aviso = espacio && estado?.nivel === "bien" ? avisoRespaldo(dias) : null;

  return (
    <section id="tus-datos" className="flex scroll-mt-4 flex-col gap-3 rounded-[22px] bg-tarjeta p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-[10px] bg-verde text-fondo">
          <Icono nombre="dashboard" className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-[17px] font-semibold">Tus datos</h2>
          <p className="text-[13px] text-texto-2">Tu espacio, respaldo y exportación</p>
        </div>
      </div>

      {espacio && estado && (
        <div className="flex flex-col gap-2 rounded-2xl bg-fondo p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-texto-2">Tu espacio</p>
          <p className="text-[28px] font-extrabold leading-tight tracking-tight tabular-nums">
            {estado.usado} <span className="text-[17px] font-semibold text-texto-2">de {estado.total}</span>
          </p>
          <Barra fraccion={estado.fraccion} clase={COLOR_NIVEL[estado.nivel]} />
          <p className={`text-[15px] font-semibold ${COLOR_NIVEL[estado.nivel]}`}>{estado.resumen}</p>
          <p className="text-[13px] text-texto-2 tabular-nums">{textoConteos(espacio)}</p>
        </div>
      )}
      {estado?.nivel === "pronto" && (
        <Alerta enTarjeta texto="Tu espacio pasa el 70%. Descarga un respaldo pronto." />
      )}
      {estado?.nivel === "lleno" && (
        <Alerta enTarjeta tono="rojo" texto="Tu espacio está casi lleno. Descarga tu respaldo para no perder nada." />
      )}

      <p className="text-[15px] leading-snug text-texto-2">
        <b>Respaldo completo:</b> guárdalo en iCloud Drive o Google Drive. Te avisamos si pasan 30 días sin respaldo.
        Sirve para recuperar todo si algo se borra.
      </p>
      {aviso ? (
        <Alerta enTarjeta texto={aviso} />
      ) : (
        espacio && <p className="text-[15px] font-semibold">{textoUltimoRespaldo(dias)}</p>
      )}
      <BotonRespaldo className="rounded-[16px] bg-verde py-3 text-center text-[17px] font-semibold text-fondo active:scale-[0.98]">
        Descargar respaldo completo
      </BotonRespaldo>
      <RestaurarRespaldo />
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
