import Link from "next/link";
import { cerrarSesion } from "@/app/acciones";
import { FormularioPerfil } from "@/components/FormularioPerfil";
import { Icono } from "@/components/Icono";
import { Encabezado, Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { requerirSesion } from "@/lib/supabase/servidor";
import { COOKIE_TEMA, leerTema } from "@/lib/tema";
import { cookies, headers } from "next/headers";
import { AtajoSiri } from "./AtajoSiri";
import { AvisosPush } from "./AvisosPush";
import { BorrarDatos } from "./BorrarDatos";
import { EspacioApp } from "./EspacioApp";
import { TusDatos } from "./TusDatos";
import { SelectorTema } from "./SelectorTema";

export default async function Ajustes() {
  const { supabase, usuario } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const [perfil, token, cabeceras, galletas, espacio, espacioApp] = await Promise.all([
    repo.perfil(),
    supabase.from("tokens_atajo").select("creado").maybeSingle(),
    headers(),
    cookies(),
    repo.espacio(),
    repo.espacioApp(),
  ]);
  const urlAtajo = `https://${cabeceras.get("host") ?? "savewise-inky.vercel.app"}/api/atajo`;

  return (
    <Pantalla>
      <Encabezado titulo="Ajustes" atras={{ href: "/", texto: "Inicio" }} />

      <div className="flex items-center gap-4 rounded-[22px] bg-tarjeta p-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-heroe-desde to-heroe-hasta text-[24px] font-bold text-white">
          {(perfil.nombre || usuario.email || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold">{perfil.nombre || "Tu cuenta"}</p>
          <p className="truncate text-[15px] text-texto-2">{usuario.email}</p>
        </div>
      </div>

      <FormularioPerfil
        sueldo={perfil.sueldo_mensual}
        moneda={perfil.moneda_base}
        diaPago={perfil.dia_pago}
        textoBoton="Guardar cambios"
      />

      <SelectorTema actual={leerTema(galletas.get(COOKIE_TEMA)?.value)} />

      <AvisosPush />
      <AtajoSiri tieneToken={Boolean(token.data)} url={urlAtajo} />
      <Link href="/categorias" className="flex items-center justify-between rounded-[22px] bg-tarjeta px-4 py-4 text-[17px] font-semibold">
        Categorías y topes
        <Icono nombre="atras" className="size-5 rotate-180 text-texto-2" />
      </Link>
      <TusDatos espacio={espacio} />
      {espacioApp && <EspacioApp bytes={espacioApp.bytes} personas={espacioApp.personas} />}

      <BorrarDatos />

      <form action={cerrarSesion}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-tarjeta py-4 text-[17px] font-semibold text-rojo"
        >
          <Icono nombre="salir" className="size-5" />
          Cerrar sesión
        </button>
      </form>
    </Pantalla>
  );
}
