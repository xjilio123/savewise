import type { ReactNode } from "react";

// Ocultar montos: cada cifra lleva su valor real y su versión "S/ ••••". El CSS muestra una u
// otra según data-privado en <html>, así el cambio es instantáneo y la página llega ya oculta
// desde el servidor. Sirve igual en componentes de servidor y de cliente.

const PUNTOS = "••••";

/** Montos como los escribe formatearDinero ("S/ 1,500.00", "USD 10.00") o la IA ("PEN 890.20"). */
const MONEDA = String.raw`(?:S\/|PEN|USD|EUR|MXN|COP|CLP|ARS|US\$|€|\$)`;
const PATRON_MONTO = new RegExp(String.raw`(-?${MONEDA}\s?-?\d[\d.,]*\d|-?${MONEDA}\s?\d)`, "g");
const ES_MONTO = new RegExp(String.raw`^-?${MONEDA}\s?-?\d`);

/** Símbolo de la moneda de un monto ya formateado ("S/ 1,500.00" → "S/"). */
export function simboloDe(texto: string): string {
  return texto.replace(/[-\d.,\s]+/g, "").trim();
}

export function Monto({ texto }: { texto: string }) {
  const simbolo = simboloDe(texto);
  return (
    <span className="cifra">
      <span className="cifra-real">{texto}</span>
      <span className="cifra-oculta" aria-label="monto oculto">
        {simbolo ? `${simbolo} ${PUNTOS}` : PUNTOS}
      </span>
    </span>
  );
}

/** Parte un texto y oculta solo los montos: "Tus gastos son S/ 900.00" → "Tus gastos son S/ ••••". */
export function partirMontos(texto: string): { texto: string; esMonto: boolean }[] {
  return texto
    .split(PATRON_MONTO)
    .filter((parte) => parte !== "")
    .map((parte) => ({ texto: parte, esMonto: ES_MONTO.test(parte) }));
}

export function ConMontos({ texto }: { texto: string }): ReactNode {
  return partirMontos(texto).map((p, i) => (p.esMonto ? <Monto key={i} texto={p.texto} /> : p.texto));
}
