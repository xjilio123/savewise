import { BarraPestanas } from "@/components/BarraPestanas";

export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <BarraPestanas />
    </>
  );
}
