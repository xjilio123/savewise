import { VistaDeudas } from "@/components/vistas/VistaDeudas";
import { crearRepositorio } from "@/lib/datos/repositorio";
import { requerirSesion } from "@/lib/supabase/servidor";

export default async function Deudas() {
  const { supabase } = await requerirSesion();
  const repo = crearRepositorio(supabase);
  const [perfil, deudas] = await Promise.all([repo.perfil(), repo.deudas()]);
  return <VistaDeudas deudas={deudas} moneda={perfil.moneda_base} />;
}
