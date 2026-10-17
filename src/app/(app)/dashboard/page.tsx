import { Proximamente } from "@/components/Proximamente";
import { requerirUsuario } from "@/lib/supabase/servidor";

export default async function Dashboard() {
  await requerirUsuario();
  return (
    <Proximamente
      titulo="Dashboard"
      texto="Aquí verás tus gastos por categoría en una dona, por mes y por año, junto con los consejos del mes."
    />
  );
}
