import { ArrowLeft, LogOut } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { Logo } from "@/components/logo";
import { PersonAvatar } from "@/components/person-avatar";
import { Shell } from "@/components/shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

/**
 * La barra de arriba.
 *
 * Va sobre el color de marca en vez de blanco: era lo que dejaba la app
 * plana. Los controles son claros sobre ese fondo, así que llevan su propio
 * `text-white` y no los tonos del tema — es la única zona de la app que no
 * cambia entre claro y oscuro, a propósito, para que el encabezado sea
 * siempre el mismo punto de referencia.
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
          "linear-gradient(135deg, var(--primary) 0%, color-mix(in oklch, var(--primary), #000 22%) 100%)",
      }}
    >
      <Shell width="wide" className="flex items-center gap-2 py-3">
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
          <Logo
            markClassName="size-9 drop-shadow-sm"
            wordClassName="sr-only"
            className="shrink-0"
          />
        )}

        {emoji && (
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl leading-none"
            aria-hidden
          >
            {emoji}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="font-heading truncate text-lg leading-tight font-semibold">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-white/75">{subtitle}</p>
          )}
        </div>

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
              className="ring-2 ring-white/40"
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
      </Shell>
    </header>
  );
}
