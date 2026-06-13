import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Server Stress Testing Dashboard",
  description: "Monitoreo y saturación de recursos en entornos distribuidos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
