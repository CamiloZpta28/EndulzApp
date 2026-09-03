import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/**
 * Fraunces para los títulos: una serif variable con un eje `SOFT` que le da
 * el aire dulce del nombre sin volverse caricatura. Plus Jakarta Sans para el
 * cuerpo, que es donde importa la legibilidad en pantalla chiquita.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EndulzApp — Amigo Secreto",
  description:
    "Organiza el amigo secreto del parche: participantes, presupuestos, listas de antojos y el sorteo, sin trampas.",
  applicationName: "EndulzApp",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#141013" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning` porque next-themes escribe la clase del tema
    // en <html> antes de que React hidrate.
    <html
      lang="es"
      suppressHydrationWarning
      className={`${jakarta.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
