import { describe, expect, it } from "vitest";
import { armarRespaldo } from "./respaldo";
import { leerRespaldo, planRestauracion, type RespaldoArchivo } from "./restaurar";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function respaldoDePrueba() {
  return armarRespaldo({
    hoy: "2026-10-18",
    perfil: { sueldo_mensual: 1500, moneda_base: "PEN", moneda_sueldo: "PEN", dia_pago: 30 },
    categorias: [
      { id: U(1), user_id: "u", nombre: "Alimentación", color: "naranja", icono: "cart", tope: 400, creado: "x" },
      { id: U(2), user_id: "u", nombre: "Mascotas", color: "naranja", icono: "", tope: null, creado: "x" },
    ],
    metas: [{ id: U(10), user_id: "u", nombre: "Navidad", objetivo: 800, moneda: "PEN", fecha_objetivo: null, archivada: false, reto_base: null, creado: "x" }],
    deudas: [],
    movimientos: [
      { id: U(100), user_id: "u", fecha: "2026-10-01", tipo: "GASTO", categoria_id: U(1), meta_id: null, deuda_id: null, concepto: "Mercado", monto: 50, moneda: "PEN", tipo_cambio: 1, monto_base: 50, recurrente: false, nota: "", creado: "x" },
      { id: U(101), user_id: "u", fecha: "2026-10-02", tipo: "AHORRO", categoria_id: null, meta_id: U(10), deuda_id: null, concepto: "Aporte", monto: 100, moneda: "PEN", tipo_cambio: 1, monto_base: 100, recurrente: false, nota: "", creado: "x" },
    ],
  });
}

const leer = (obj: unknown) => leerRespaldo(JSON.stringify(obj));

describe("leerRespaldo", () => {
  it("acepta el respaldo que genera la propia app", () => {
    expect("respaldo" in leer(respaldoDePrueba())).toBe(true);
  });

  it("rechaza archivos que no son JSON, de otra app o manipulados", () => {
    expect(leerRespaldo("no es json")).toEqual({ error: expect.stringContaining("JSON") });
    expect("error" in leer({ ...respaldoDePrueba(), app: "OtraApp" })).toBe(true);
    const r = respaldoDePrueba();
    expect("error" in leer({ ...r, movimientos: [{ ...r.movimientos[0], tipo: "ROBO" }] })).toBe(true);
    expect("error" in leer({ ...r, movimientos: [{ ...r.movimientos[0], id: "1; drop table" }] })).toBe(true);
    expect("error" in leer({ ...r, movimientos: [{ ...r.movimientos[0], concepto: "x".repeat(500) }] })).toBe(true);
  });

  it("ignora campos de más como user_id o monto_base", () => {
    const r = leer(respaldoDePrueba());
    if (!("respaldo" in r)) throw new Error("debía leerse");
    expect(r.respaldo.movimientos[0]).not.toHaveProperty("user_id");
    expect(r.respaldo.movimientos[0]).not.toHaveProperty("monto_base");
  });
});

describe("planRestauracion", () => {
  const archivo = () => {
    const r = leer(respaldoDePrueba());
    if (!("respaldo" in r)) throw new Error("debía leerse");
    return r.respaldo as RespaldoArchivo;
  };

  it("en una cuenta nueva reutiliza las categorías por nombre y da colores libres", () => {
    const plan = planRestauracion(archivo(), {
      categorias: [{ id: U(900), nombre: "alimentación", color: "naranja" }],
      metas: [],
      deudas: [],
    });
    // Alimentación ya existe (otro id): se reutiliza; Mascotas se crea con un color que no sea naranja.
    expect(plan.categorias).toHaveLength(1);
    expect(plan.categorias[0]).toMatchObject({ nombre: "Mascotas" });
    expect(plan.categorias[0]!.color).not.toBe("naranja");
    expect(plan.movimientos.find((m) => m.concepto === "Mercado")?.categoria_id).toBe(U(900));
  });

  it("restaurar sobre los mismos datos no crea nada nuevo salvo movimientos (que la base ignora por id)", () => {
    const plan = planRestauracion(archivo(), {
      categorias: [
        { id: U(1), nombre: "Alimentación", color: "naranja" },
        { id: U(2), nombre: "Mascotas", color: "rojo" },
      ],
      metas: [{ id: U(10), nombre: "Navidad" }],
      deudas: [],
    });
    expect(plan.categorias).toEqual([]);
    expect(plan.metas).toEqual([]);
    expect(plan.movimientos.map((m) => m.id)).toEqual([U(100), U(101)]);
  });

  it("un ahorro cuya meta no existe se omite (la base exige meta)", () => {
    const r = archivo();
    const plan = planRestauracion({ ...r, metas: [] }, { categorias: [], metas: [], deudas: [] });
    expect(plan.omitidos).toBe(1);
    expect(plan.movimientos.every((m) => m.tipo !== "AHORRO")).toBe(true);
  });
});
