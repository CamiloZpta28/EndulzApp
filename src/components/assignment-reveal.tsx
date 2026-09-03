"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, ListOrdered, PartyPopper } from "lucide-react";

import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * El nombre que salió, tapado hasta que lo mantienes presionado.
 *
 * Presionar y sostener en vez de alternar con un clic: si queda destapado,
 * cualquiera que pase por detrás lo ve. Así el nombre solo está en pantalla
 * mientras el dedo está encima, y se vuelve a tapar al soltar — incluso si
 * suelta fuera del botón o el navegador cancela el gesto (de ahí
 * `pointercancel` y el `blur`).
 */
export function AssignmentReveal({
  name,
  avatarUrl,
  onOpenList,
}: {
  name: string;
  avatarUrl?: string | null;
  /** Cuando viene, se ofrece abrir su lista sin destapar el nombre. */
  onOpenList?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Un puntero que se suelta afuera no dispara `pointerup` en el botón; el
  // listener en `window` es la red de seguridad para que no quede destapado.
  useEffect(() => {
    if (!revealed) return;
    const hide = () => setRevealed(false);
    window.addEventListener("pointerup", hide);
    window.addEventListener("pointercancel", hide);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("pointerup", hide);
      window.removeEventListener("pointercancel", hide);
      window.removeEventListener("blur", hide);
    };
  }, [revealed]);

  return (
    <div className="bg-card space-y-3 rounded-xl border p-5 text-center">
      <PartyPopper className="text-primary mx-auto size-7" aria-hidden />
      <p className="text-muted-foreground text-sm">Te salió…</p>

      <button
        ref={buttonRef}
        type="button"
        // `touch-none` evita que el navegador interprete el sostener como
        // scroll o selección de texto en celular.
        className={cn(
          "focus-visible:ring-ring/50 relative w-full touch-none rounded-xl py-6 transition-colors select-none focus-visible:ring-3 focus-visible:outline-none",
          revealed ? "bg-primary/5" : "bg-muted hover:bg-muted/70 cursor-pointer",
        )}
        onPointerDown={() => setRevealed(true)}
        onPointerUp={() => setRevealed(false)}
        onPointerCancel={() => setRevealed(false)}
        onPointerLeave={() => setRevealed(false)}
        onContextMenu={(event) => event.preventDefault()}
        // Teclado: mantener Espacio o Enter hace lo mismo que sostener.
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") setRevealed(true);
        }}
        onKeyUp={() => setRevealed(false)}
        onBlur={() => setRevealed(false)}
        aria-pressed={revealed}
        aria-label={
          revealed
            ? `Te salió ${name}`
            : "Mantén presionado para ver a quién te salió"
        }
      >
        {revealed ? (
          <span className="flex flex-col items-center gap-2">
            {avatarUrl && (
              <PersonAvatar name={name} src={avatarUrl} size="lg" />
            )}
            <span className="text-primary text-3xl leading-tight font-bold break-words">
              {name}
            </span>
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <span
              className="text-muted-foreground/60 text-3xl font-bold blur-[6px] select-none"
              aria-hidden
            >
              {/* La misma cantidad de letras, borrosa: se ve que hay algo
                  escrito sin que se pueda leer ni contar. */}
              {"●".repeat(Math.min(Math.max(name.length, 4), 12))}
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <Eye className="size-3.5" aria-hidden />
              Mantén presionado para ver
            </span>
          </span>
        )}
      </button>

      {onOpenList && (
        <Button variant="outline" className="w-full" onClick={onOpenList}>
          <ListOrdered className="size-4" aria-hidden />
          Ver su lista de antojos
        </Button>
      )}
    </div>
  );
}
