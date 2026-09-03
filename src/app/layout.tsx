import type { Metadata, Viewport } from "next";
import { Baloo_2, Plus_Jakarta_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/**
 * Baloo 2 para títulos y para el nombre de la app: redonda y con peso, que es
 * la estética que pide un parche de dulces. Antes había una serif (Fraunces)
 * y se sentía de revista, no de app. Plus Jakarta Sans para el cuerpo, donde
 * lo que importa es leer cómodo en pantalla chiquita.
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
      className={`${jakarta.variable} ${baloo.variable} h-full antialiased`}
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
