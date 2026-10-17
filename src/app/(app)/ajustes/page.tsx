import { cerrarSesion } from "@/app/acciones";
import { FormularioPerfil } from "@/components/FormularioPerfil";
import { Icono } from "@/components/Icono";
import { Encabezado, Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { requerirUsuario } from "@/lib/supabase/servidor";
import { BorrarDatos } from "./BorrarDatos";

export default async function Ajustes() {
  const { supabase, usuario } = await requerirUsuario();
  const perfil = await crearRepositorio(supabase).perfil();

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
