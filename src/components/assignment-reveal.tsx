"use client";

import { useState } from "react";
import { Eye, EyeOff, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Hides the drawn name behind a tap. The whole parche tends to be looking at
 * the same phone when the draw happens.
 */
export function AssignmentReveal({ name }: { name: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="bg-card space-y-3 rounded-xl border p-5 text-center">
      <PartyPopper className="text-primary mx-auto size-7" aria-hidden />
      <p className="text-muted-foreground text-sm">Te salió…</p>

      {revealed ? (
        <p className="text-primary text-3xl leading-tight font-bold break-words">
          {name}
        </p>
      ) : (
        <p
          className="bg-muted text-muted-foreground rounded-lg py-3 text-3xl font-bold select-none"
          aria-hidden
        >
          ● ● ● ● ●
        </p>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setRevealed((value) => !value)}
      >
        {revealed ? (
          <>
            <EyeOff className="size-4" aria-hidden />
            Esconder
          </>
        ) : (
          <>
            <Eye className="size-4" aria-hidden />
            Mostrar quién me salió
          </>
        )}
      </Button>
    </div>
  );
}
