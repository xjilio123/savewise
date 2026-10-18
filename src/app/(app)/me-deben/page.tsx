import { VistaMeDeben } from "@/components/vistas/VistaMeDeben";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { hoyLima } from "@/lib/fechas";
import { requerirSesion } from "@/lib/supabase/servidor";

export default async function MeDeben() {
  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const [perfil, prestamos] = await Promise.all([repo.perfil(), repo.prestamos()]);
  return <VistaMeDeben prestamos={prestamos} moneda={perfil.moneda_base} hoy={hoyLima()} />;
}
