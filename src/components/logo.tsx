import { cn } from "@/lib/utils";

/**
 * El logo: un caramelo de envoltura retorcida.
 *
 * El cuerpo va en `--primary` y las dos alitas toman los acentos de las dos
 * listas (`--endulzada` y `--regalo`), así el logo mismo cuenta que el parche
 * tiene dos regalos. Legible desde 20px: nada más fino que 1.5 de trazo.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="EndulzApp"
      className={cn("size-8", className)}
    >
      {/* alita izquierda */}
      <path
        d="M13.5 24 6 16.5c-.9-.9-2.5-.3-2.5 1v13c0 1.3 1.6 1.9 2.5 1L13.5 24Z"
        fill="var(--endulzada)"
      />
      {/* alita derecha */}
      <path
        d="M34.5 24 42 16.5c.9-.9 2.5-.3 2.5 1v13c0 1.3-1.6 1.9-2.5 1L34.5 24Z"
        fill="var(--regalo)"
      />
      {/* cuerpo */}
      <circle cx="24" cy="24" r="11.5" fill="var(--primary)" />
      {/* brillo: el reflejo del celofán */}
      <path
        d="M18.5 18.5c1.6-1.7 4-2.7 6.2-2.6"
        stroke="var(--primary-foreground)"
        strokeOpacity=".75"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Logo + nombre, para cabeceras y pantallas de entrada. */
export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="font-heading text-lg leading-none font-semibold tracking-tight">
        EndulzApp
      </span>
    </span>
  );
}
