import { ArrowLeft, LogOut } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export function AppHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <header className="bg-background/85 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3">
        {backHref && (
          <ButtonLink
            href={backHref}
            aria-label="Volver"
            variant="ghost"
            size="icon"
            className="-ml-2 shrink-0"
          >
            <ArrowLeft className="size-5" />
          </ButtonLink>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate leading-tight font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
          )}
        </div>

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
      </div>
    </header>
  );
}
