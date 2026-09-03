import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * El contenedor de ancho de la app.
 *
 * Móvil es la medida de referencia (una columna, cómoda al pulgar). En
 * escritorio no se estira el texto hasta el borde — se sube el techo lo justo
 * para que el contenido pueda ir en dos columnas y deje de verse un pasillo
 * vacío a los lados.
 */
export function Shell({
  children,
  className,
  width = "app",
}: {
  children: ReactNode;
  className?: string;
  /** `app` = pantallas de contenido · `wide` = rejillas · `narrow` = formularios */
  width?: "app" | "wide" | "narrow";
}) {
  const max = {
    narrow: "max-w-sm",
    app: "max-w-md md:max-w-3xl",
    wide: "max-w-md md:max-w-5xl",
  }[width];

  return (
    <div className={cn("mx-auto w-full px-4 md:px-6", max, className)}>
      {children}
    </div>
  );
}
