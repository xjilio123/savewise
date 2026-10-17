import Link from "next/link";
import { redirect } from "next/navigation";
import { Anillos } from "@/components/Anillos";
import { Icono } from "@/components/Icono";
import { Pantalla, Tarjeta } from "@/components/ui";
import { generarConsejos } from "@/lib/consejos";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { calcularResumen, formatearDinero, fraccion } from "@/lib/dinero";
import { fechaLarga, hoyLima, rangoDelMes } from "@/lib/fechas";
import { requerirUsuario } from "@/lib/supabase/servidor";

export default async function Inicio() {
  const { supabase, usuario } = await requerirUsuario();
  const repo = crearRepositorio(supabase);
  const perfil = await repo.perfil();
  if (perfil.sueldo_mensual <= 0) redirect("/bienvenida");

  const hoy = hoyLima();
  const mes = rangoDelMes(hoy);
  const r = calcularResumen(perfil.sueldo_mensual, await repo.movimientosEntre(mes.desde, mes.hasta));
  const dinero = (n: number) => formatearDinero(n, perfil.moneda_base);
  const consejo = generarConsejos(r, mes, perfil.moneda_base)[0];
  const inicial = (perfil.nombre || usuario.email || "?").charAt(0).toUpperCase();

  const partes = [
    { nombre: "Gastos", monto: r.gastos, texto: "text-rojo", anillo: "text-rojo-relleno" },
    { nombre: "Ahorros", monto: r.ahorros, texto: "text-verde", anillo: "text-verde-relleno" },
    { nombre: "Para mí", monto: r.paraMi, texto: "text-morado", anillo: "text-morado-relleno" },
  ];

  return (
    <Pantalla>
      <header className="flex items-end justify-between pt-2">
        <div>
          <p className="text-[15px] font-semibold text-texto-2">{fechaLarga(hoy)}</p>
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Inicio</h1>
        </div>
        <Link
          href="/ajustes"
          aria-label="Ajustes"
          className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-heroe-desde to-heroe-hasta text-[20px] font-bold text-white"
        >
          {inicial}
        </Link>
      </header>

      <section className="rounded-[28px] bg-gradient-to-br from-heroe-desde to-heroe-hasta p-6 text-white shadow-[0_12px_30px_rgb(0_98_209/0.28)]">
        <p className="text-[15px] font-semibold text-white/85">Sin asignar</p>
        <p className="text-[44px] font-extrabold leading-tight tracking-tight tabular-nums">{dinero(r.sinAsignar)}</p>
        <p className="text-[15px] text-white/85">de {dinero(r.ingresos)} de ingresos este mes</p>
      </section>

      <Tarjeta className="flex items-center gap-5">
        <Anillos
          etiqueta={`Gastos ${Math.round(fraccion(r.gastos, r.ingresos) * 100)}%, ahorros ${Math.round(
            fraccion(r.ahorros, r.ingresos) * 100,
          )}% y Para mí ${Math.round(fraccion(r.paraMi, r.ingresos) * 100)}% del sueldo`}
          anillos={partes.map((p) => ({ fraccion: fraccion(p.monto, r.ingresos), clase: p.anillo }))}
        />
        <dl className="flex flex-1 flex-col gap-2.5">
          {partes.map((p) => (
            <div key={p.nombre}>
              <dt className="text-[15px] text-texto-2">{p.nombre}</dt>
              <dd className={`text-[17px] font-bold tabular-nums ${p.texto}`}>{dinero(p.monto)}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <Link href="/para-mi" className="flex items-center justify-between rounded-[22px] bg-tarjeta px-5 py-4">
        <span>
          <span className="block text-[15px] text-texto-2">Para mí · te quedan</span>
          <span className="block text-[20px] font-bold tabular-nums text-morado">{dinero(r.paraMiRestante)}</span>
        </span>
        <Icono nombre="atras" className="size-5 rotate-180 text-texto-2" />
      </Link>

      {consejo && (
        <div className="flex items-start gap-3 rounded-[22px] bg-tinte-morado px-5 py-4">
          <Icono nombre="bombilla" className="mt-0.5 size-6 shrink-0 text-morado" />
          <p className="text-[16px] leading-snug">
            <span className="font-semibold">{consejo.titulo}:</span> {consejo.texto}
          </p>
        </div>
      )}
    </Pantalla>
  );
}
