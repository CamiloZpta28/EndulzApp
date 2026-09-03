import { cn } from "@/lib/utils";

/**
 * El logo: una cajita de regalo con el moño hecho de dos caramelos.
 *
 * Junta las dos mitades de la app en una sola figura — la caja es el regalo
 * grande, los caramelos del moño son la endulzada — y usa los tres colores de
 * marca. Formas macizas y nada por debajo de 2px de grosor, para que aguante
 * a 16px en la pestaña del navegador.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="EndulzApp"
      className={cn("size-8", className)}
    >
      {/* cuerpo de la caja */}
      <rect x="7" y="20" width="34" height="21" rx="5" fill="var(--primary)" />
      {/* cinta vertical */}
      <rect
        x="21.5"
        y="20"
        width="5"
        height="21"
        fill="var(--primary-foreground)"
        opacity=".85"
      />
      {/* tapa */}
      <rect x="5" y="16" width="38" height="8" rx="3" fill="var(--primary)" />
      <rect
        x="21.5"
        y="16"
        width="5"
        height="8"
        fill="var(--primary-foreground)"
        opacity=".85"
      />
      {/* moño: dos caramelos, uno por cada lista */}
      <circle cx="16" cy="11" r="7" fill="var(--endulzada)" />
      <circle cx="32" cy="11" r="7" fill="var(--regalo)" />
      {/* nudo */}
      <circle cx="24" cy="13.5" r="3.5" fill="var(--primary)" />
    </svg>
  );
}

/** Logo + nombre, para cabeceras y pantallas de entrada. */
export function Logo({
  className,
  markClassName,
  wordClassName,
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span
        className={cn(
          // Baloo 2: redonda y con peso, para que el nombre suene dulce sin
          // depender de la serif que usan los títulos.
          "font-logo text-xl leading-none font-extrabold tracking-tight",
          wordClassName,
        )}
      >
        EndulzApp
      </span>
    </span>
  );
}
