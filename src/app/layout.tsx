import type { Metadata, Viewport } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ImportacionesJuank PIM",
  description: "Centro maestro de catálogo e inventario → Shopify / EMY",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Juank PIM",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-dvh font-sans antialiased text-ios-label">
        {children}
      </body>
    </html>
  );
}
