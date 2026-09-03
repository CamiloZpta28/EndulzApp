import Image from "next/image";

import { cn } from "@/lib/utils";

const SIZES = { sm: 32, md: 40, lg: 96 } as const;

/**
 * Foto de perfil, con las iniciales de respaldo.
 *
 * No usa el `Avatar` de shadcn porque ese trae su propio manejo de carga en
 * el cliente; acá el fallback se decide en el servidor con lo que haya en la
 * base, que es una cosa menos que hidratar.
 */
export function PersonAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() ?? "")
    .join("");

  const shape = cn(
    "shrink-0 overflow-hidden rounded-full",
    size === "lg" ? "size-24" : size === "sm" ? "size-8" : "size-10",
    className,
  );

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={px}
        height={px}
        unoptimized
        className={cn(shape, "object-cover")}
      />
    );
  }

  return (
    <span
      className={cn(
        shape,
        "bg-primary/10 text-primary flex items-center justify-center font-semibold",
        size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm",
      )}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
