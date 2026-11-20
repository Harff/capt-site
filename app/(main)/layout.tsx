import { AppHeader } from "@/components/AppHeader";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-canvas">
      <AppHeader />
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
