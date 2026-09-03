import { ArrowLeft, LogOut } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { LogoMark } from "@/components/logo";
import { PersonAvatar } from "@/components/person-avatar";
import { Shell } from "@/components/shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

/**
 * La barra de arriba.
 *
 * Dos filas a propósito: arriba los controles (volver, tema, perfil, salir) y
 * abajo el título grande. Con todo en una sola fila el título competía con
 * cinco botones y quedaba del tamaño de un texto normal — de ahí la sensación
 * de encabezado plano.
 *
 * Va sobre el color de marca, y los controles llevan su propio `text-white`
 * porque este es el único bloque de la app que no cambia entre claro y
 * oscuro: es el punto de referencia fijo.
 */
export function AppHeader({
  title,
  subtitle,
  emoji,
  backHref,
  me,
}: {
  title: string;
  subtitle?: string;
  emoji?: string | null;
  backHref?: string;
  /** Cuando viene, el avatar es el acceso al perfil. */
  me?: { name: string; avatarUrl: string | null } | null;
}) {
  return (
    <header
      className="sticky top-0 z-10 text-white"
      style={{
        background:
          "linear-gradient(150deg, color-mix(in oklch, var(--primary), #fff 8%) 0%, var(--primary) 45%, color-mix(in oklch, var(--primary), #000 30%) 100%)",
      }}
    >
      <Shell width="wide" className="pt-3 pb-4">
        {/* fila de controles */}
        <div className="flex items-center gap-1">
          {backHref ? (
            <ButtonLink
              href={backHref}
              aria-label="Volver"
              variant="ghost"
              size="icon"
              className="-ml-2 shrink-0 text-white hover:bg-white/15 hover:text-white"
            >
              <ArrowLeft className="size-5" />
            </ButtonLink>
          ) : (
            <LogoMark variant="onBrand" className="size-8 shrink-0 drop-shadow-sm" />
          )}

          <span className="flex-1" />

          <ThemeToggle className="text-white hover:bg-white/15 hover:text-white" />

          {me && (
            <ButtonLink
              href="/perfil"
              aria-label="Mi perfil"
              variant="ghost"
              size="icon"
              className="shrink-0 text-white hover:bg-white/15 hover:text-white"
            >
              <PersonAvatar
                name={me.name}
                src={me.avatarUrl}
                size="sm"
                className="ring-2 ring-white/50"
              />
            </ButtonLink>
          )}

          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="shrink-0 text-white hover:bg-white/15 hover:text-white"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-5" />
            </Button>
          </form>
        </div>

        {/* fila del título */}
        <div className="mt-1 flex items-center gap-3">
          {emoji && (
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl leading-none shadow-sm md:size-14 md:text-3xl"
              aria-hidden
            >
              {emoji}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-heading truncate text-2xl leading-tight font-extrabold tracking-tight md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-sm text-white/80">{subtitle}</p>
            )}
          </div>
        </div>
      </Shell>
    </header>
  );
}
