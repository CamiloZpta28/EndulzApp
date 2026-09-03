import { ArrowLeft, LogOut } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { LogoMark } from "@/components/logo";
import { PersonAvatar } from "@/components/person-avatar";
import { Shell } from "@/components/shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

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
    <header className="bg-background/85 sticky top-0 z-10 border-b backdrop-blur">
      <Shell width="wide" className="flex items-center gap-2 py-3">
        {backHref ? (
          <ButtonLink
            href={backHref}
            aria-label="Volver"
            variant="ghost"
            size="icon"
            className="-ml-2 shrink-0"
          >
            <ArrowLeft className="size-5" />
          </ButtonLink>
        ) : (
          <LogoMark className="size-8 shrink-0" />
        )}

        {emoji && (
          <span className="shrink-0 text-xl leading-none" aria-hidden>
            {emoji}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base leading-tight font-semibold">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
          )}
        </div>

        <ThemeToggle />

        {me && (
          <ButtonLink
            href="/perfil"
            aria-label="Mi perfil"
            variant="ghost"
            size="icon"
            className="shrink-0"
          >
            <PersonAvatar name={me.name} src={me.avatarUrl} size="sm" />
          </ButtonLink>
        )}

        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-5" />
          </Button>
        </form>
      </Shell>
    </header>
  );
}
