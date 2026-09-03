import { ArrowLeft, LogOut } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { LogoMark } from "@/components/logo";
import { PersonAvatar } from "@/components/person-avatar";
import { Shell } from "@/components/shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/**
 * La barra de arriba: una sola fila, con el bloque de identidad centrado.
 *
 * A la izquierda en celular y centrado en escritorio. En una pantalla angosta
 * centrar deja el título apretado entre los botones y se lee peor; en una
 * ancha, pegado a la izquierda queda perdido con todo el espacio a la derecha.
 *
 * Los laterales van fuera del flujo con `absolute` para que el centrado sea
 * respecto a la PANTALLA y no al espacio que sobra entre los botones — con
 * ellos en el flujo el título se corría según cuántos controles tuviera cada
 * pantalla (el dashboard no tiene botón de volver, el grupo sí). El `pl` en
 * celular es para no quedar debajo del botón de volver.
 *
 * Va sobre el color de marca, y los controles llevan su propio `text-white`
 * porque este es el único bloque que no cambia entre claro y oscuro: es el
 * punto de referencia fijo.
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
      // El relleno de arriba es la zona segura (barra de estado / notch): el
      // degradado la cubre y el color queda continuo, en vez de dejar una
      // franja del color del fondo.
      className="sticky top-0 z-10 pt-[env(safe-area-inset-top)] text-white"
      style={{
        background:
          "linear-gradient(150deg, color-mix(in oklch, var(--primary), #fff 8%) 0%, var(--primary) 45%, color-mix(in oklch, var(--primary), #000 30%) 100%)",
      }}
    >
      <Shell width="wide" className="relative flex items-center py-2.5">
        {/* izquierda */}
        {backHref && (
          <div className="absolute left-4 flex items-center md:left-6">
            <ButtonLink
              href={backHref}
              aria-label="Volver"
              variant="ghost"
              size="icon"
              className="-ml-2 text-white hover:bg-white/15 hover:text-white"
            >
              <ArrowLeft className="size-5" />
            </ButtonLink>
          </div>
        )}

        {/* centro: la paleta a la izquierda del nombre.
            El ancho máximo deja libres los laterales para que el título se
            recorte en vez de meterse debajo de los botones. */}
        <div
          className={cn(
            "flex min-w-0 max-w-[calc(100%-8rem)] items-center gap-2.5 md:mx-auto md:max-w-[calc(100%-16rem)]",
            backHref && "pl-9 md:pl-0",
          )}
        >
          {emoji ? (
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl leading-none"
              aria-hidden
            >
              {emoji}
            </span>
          ) : (
            <LogoMark variant="onBrand" className="size-9 shrink-0 drop-shadow-sm" />
          )}

          <div className="min-w-0">
            <h1 className="font-heading truncate text-xl leading-tight font-extrabold tracking-tight sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-white/80">{subtitle}</p>
            )}
          </div>
        </div>

        {/* derecha */}
        <div className="absolute right-4 flex items-center md:right-6">
          <ThemeToggle className="text-white hover:bg-white/15 hover:text-white" />

          {me && (
            <ButtonLink
              href="/perfil"
              aria-label="Mi perfil"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 hover:text-white"
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
              className="text-white hover:bg-white/15 hover:text-white"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-5" />
            </Button>
          </form>
        </div>
      </Shell>
    </header>
  );
}
