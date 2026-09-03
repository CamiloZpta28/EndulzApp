import { cn } from "@/lib/utils";

/**
 * El logo: una paleta.
 *
 * El remolino es una sola línea gruesa, sin nada por debajo de 3 px de trazo,
 * para que a 20 px (la pestaña del navegador) siga leyéndose como espiral y
 * no como una manchita.
 *
 * `variant="onBrand"` invierte el caramelo a blanco: sobre el encabezado, que
 * es del color de marca, un caramelo del mismo color desaparecería. El palito
 * usa un neutro tibio que se ve tanto sobre blanco como sobre el degradado.
 */
export function LogoMark({
  className,
  variant = "color",
}: {
  className?: string;
  variant?: "color" | "onBrand";
}) {
  const candy = variant === "onBrand" ? "#fff" : "var(--primary)";
  const swirl =
    variant === "onBrand" ? "var(--primary)" : "var(--primary-foreground)";
  const stick = variant === "onBrand" ? "rgba(255,255,255,.75)" : "oklch(0.72 0.03 60)";

  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="EndulzApp"
      className={cn("size-8", className)}
    >
      <rect x="22" y="26" width="4" height="18" rx="2" fill={stick} />
      <circle cx="24" cy="19" r="15" fill={candy} />
      <path
        d="M24 19 m0 -10 a10 10 0 1 1 -7.07 17.07 a7 7 0 1 0 9.9 -9.9 a4 4 0 1 1 -5.66 5.66"
        fill="none"
        stroke={swirl}
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity=".9"
      />
    </svg>
  );
}

/** Logo + nombre, para cabeceras y pantallas de entrada. */
export function Logo({
  className,
  markClassName,
  wordClassName,
  variant = "color",
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
  variant?: "color" | "onBrand";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} variant={variant} />
      <span
        className={cn(
          "font-logo text-xl leading-none font-extrabold tracking-tight",
          wordClassName,
        )}
      >
        EndulzApp
      </span>
    </span>
  );
}
