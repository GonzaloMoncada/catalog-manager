import type { Metadata } from "next";
import { Montserrat, Fira_Sans } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["600", "700", "800"],
});

const firaSans = Fira_Sans({
  subsets: ["latin"],
  variable: "--font-fira",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Comercial Brich — Catálogo",
  description: "Catálogo de productos Comercial Brich",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} ${firaSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
