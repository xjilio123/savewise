import { Proximamente } from "@/components/Proximamente";
import { requerirUsuario } from "@/lib/supabase/servidor";

export default async function Historial() {
  await requerirUsuario();
  return (
    <Proximamente
      titulo="Historial"
      texto="Aquí verás todos tus movimientos, 20 por página, con filtros por rango de fechas, tipo y categoría."
    />
  );
}
