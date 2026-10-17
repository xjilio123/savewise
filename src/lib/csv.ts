// Exportación a CSV (se abre directo en Google Sheets, Numbers o Excel).

type Valor = string | number | boolean | null | undefined;

/**
 * Una celda de texto que empieza con = + - @ (o tab / retorno) se ejecutaría como fórmula al abrir el
 * archivo en una hoja de cálculo (inyección de fórmulas / CSV injection). Se antepone un apóstrofo
 * para que se muestre como texto. Los números reales no se tocan.
 */
export function celdaSegura(valor: Valor): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : "";
  if (typeof valor === "boolean") return valor ? "sí" : "no";
  const texto = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV con BOM UTF-8 (para que las tildes se vean bien) y fin de línea CRLF. */
export function aCsv(encabezados: string[], filas: Valor[][]): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celdaSegura).join(","));
  return `﻿${lineas.join("\r\n")}\r\n`;
}
