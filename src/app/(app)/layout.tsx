import { BarraPestanas } from "@/components/BarraPestanas";
import { EstadoConexion } from "@/components/pwa/EstadoConexion";

export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <EstadoConexion />
      {children}
      <BarraPestanas />
    </>
  );
}
