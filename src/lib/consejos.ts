import { formatearDinero, fraccion, type Resumen } from "@/lib/dinero";
import type { RangoMes } from "@/lib/fechas";

export type Consejo = {
  id: string;
  color: "rojo" | "verde" | "morado" | "azul";
  titulo: string;
  texto: string;
};

/** Motor de reglas: cada regla mira los totales del mes y devuelve un consejo con la cifra exacta. */
export function generarConsejos(r: Resumen, mes: RangoMes, moneda = "PEN"): Consejo[] {
  const consejos: Consejo[] = [];
  const dinero = (n: number) => formatearDinero(n, moneda);
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  if (r.ingresos > 0 && r.gastos / r.ingresos > 0.5) {
    consejos.push({
      id: "gastos-altos",
      color: "rojo",
      titulo: "Gastos altos",
      texto: `Tus gastos ya son el ${pct(r.gastos / r.ingresos)} del sueldo.`,
    });
  }

  if (r.paraMi > 0) {
    const usado = fraccion(r.ocio, r.paraMi);
    const ritmoAlto = usado > mes.fraccionTranscurrida;
    consejos.push({
      id: "ritmo-para-mi",
      color: ritmoAlto ? "rojo" : "morado",
      titulo: "Para mí",
      texto: `Usaste ${pct(usado)} con ${pct(mes.fraccionTranscurrida)} del mes. ${ritmoAlto ? "Baja el ritmo." : "Vas bien."}`,
    });
  }

  if (r.ingresos > 0) {
    const ahorro = r.ahorros / r.ingresos;
    consejos.push(
      ahorro >= 0.2
        ? { id: "ahorro", color: "verde", titulo: "Ahorro", texto: `Ahorras ${pct(ahorro)}: cumples la regla 50/30/20.` }
        : { id: "ahorro", color: "verde", titulo: "Ahorro", texto: `Ahorras ${pct(ahorro)}. La meta sugerida es 20%.` },
    );
  }

  if (r.sinAsignar > 0 && mes.diasDelMes - mes.diasRestantes + 1 > 5) {
    consejos.push({
      id: "sin-destino",
      color: "azul",
      titulo: "Sin asignar",
      texto: `${dinero(r.sinAsignar)} sin destino. ¿Los mandas a una meta?`,
    });
  }

  return consejos;
}
