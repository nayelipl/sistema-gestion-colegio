// src/app/layout.tsx
import type { Metadata } from "next";
import { SessionProvider } from "./providers";

export const metadata: Metadata = {
  title: "Sistema de Gestión de Colegio",
  description: "Plataforma web para la gestión académica y administrativa del colegio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
