import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { AuthGate } from "@/components/AuthGate";
import { Toasts } from "@/components/Toasts";
import { UploadProvider } from "@/components/UploadModal";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["400", "500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: "Capt — Espace révision",
  description: "Plateforme de révision et d'approbation vidéo de Capt Production.",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={montserrat.variable}>
      <body className="font-sans">
        <StoreProvider>
          <AuthGate>
            <UploadProvider>{children}</UploadProvider>
          </AuthGate>
          <Toasts />
        </StoreProvider>
      </body>
    </html>
  );
}
