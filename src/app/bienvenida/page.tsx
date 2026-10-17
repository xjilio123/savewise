import { FormularioPerfil } from "@/components/FormularioPerfil";
import { Pantalla } from "@/components/ui";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { requerirSesion } from "@/lib/supabase/servidor";

export default async function Bienvenida() {
  const { supabase } = await requerirSesion();
  const perfil = await crearRepositorio(supabase).perfil();

  return (
    <Pantalla>
      <header className="flex flex-col gap-2 pt-6">
        <p className="text-[15px] font-semibold text-azul">Bienvenido a SaveWise</p>
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Tu sueldo</h1>
        <p className="text-[17px] text-texto-2">Mensual y en tu moneda. Lo cambias cuando quieras en Ajustes.</p>
      </header>
      <FormularioPerfil
        sueldo={perfil.sueldo_mensual}
        moneda={perfil.moneda_base}
        diaPago={perfil.dia_pago}
        textoBoton="Continuar"
      />
    </Pantalla>
  );
}
