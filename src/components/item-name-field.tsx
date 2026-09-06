"use client";

import { useState } from "react";
import { Split } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WishlistType } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<WishlistType, string> = {
  endulzada: "¿Qué se te antoja?",
  regalo: "¿Qué se te antoja?",
  vetado: "¿Qué prefieres NO recibir?",
};

const PLACEHOLDER: Record<WishlistType, string> = {
  endulzada: "Chocolatinas Jet",
  regalo: "Audífonos bluetooth",
  vetado: "Nada con maní — alergia",
};

const AYUDA: Record<WishlistType, string> = {
  endulzada:
    "Una cosa por casilla: así cada antojo lleva su foto, su link y su puesto en la lista.",
  regalo:
    "Una cosa por casilla: así cada antojo lleva su foto, su link y su puesto en la lista.",
  vetado: "Una cosa por casilla, para que se lea de una.",
};

const AVISO: Record<WishlistType, string> = {
  endulzada:
    "Parece que ahí van varios. Agrégalos uno por uno: así puedes ordenarlos por prioridad y ponerle foto a cada uno.",
  regalo:
    "Parece que ahí van varios. Agrégalos uno por uno: así puedes ordenarlos por prioridad y ponerle foto a cada uno.",
  vetado: "Parece que ahí van varios. Sepáralos para que se lean de una.",
};

/**
 * ¿Esto es un producto o una enumeración?
 *
 * Se cuentan los pedazos separados por coma, punto y coma, barra o "y". El
 * corte está en tres y no en dos a propósito: con dos casi siempre es un
 * producto con su aclaración ("Audífonos bluetooth, de diadema"), y avisar ahí
 * sería regañar a quien está haciendo las cosas bien. De tres en adelante ya
 * es una lista y casi nunca hay falso positivo.
 *
 * Se descartan los pedazos de menos de tres letras para que las comas de los
 * miles o un "y" suelto no inflen la cuenta.
 */
function pareceLista(value: string) {
  return (
    value
      .split(/\s*[,;/·]\s*|\s+y\s+/i)
      .map((parte) => parte.trim())
      .filter((parte) => parte.length >= 3).length >= 3
  );
}

/**
 * El campo del nombre del antojo, con el empujón para que sea UNO.
 *
 * La gente estaba metiendo la lista entera en una sola casilla ("los brownies,
 * las hostias, el mr tea, …"), y así se pierde casi todo lo que la app hace
 * con cada ítem: la prioridad, la foto, el link, marcarlo. El aviso aparece
 * solo cuando se nota, y nunca bloquea el guardado — quien de verdad quiera
 * escribir algo con comas puede hacerlo.
 */
export function ItemNameField({
  id,
  type,
  defaultValue = "",
  autoFocus = false,
}: {
  id: string;
  type: WishlistType;
  defaultValue?: string;
  /** En los formularios de agregar, para poder escribir de una. */
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const avisar = pareceLista(value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{LABEL[type]}</Label>
      <Input
        id={id}
        name="item_name"
        required
        maxLength={140}
        placeholder={PLACEHOLDER[type]}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-describedby={`${id}-ayuda`}
        autoFocus={autoFocus}
      />
      {/* La ayuda y el aviso comparten renglón para que el formulario no pegue
          un brinco cuando aparece el segundo. */}
      <p
        id={`${id}-ayuda`}
        className={cn(
          "flex items-start gap-1.5 text-xs",
          avisar ? "text-primary font-medium" : "text-muted-foreground",
        )}
      >
        {avisar && <Split className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
        {avisar ? AVISO[type] : AYUDA[type]}
      </p>
    </div>
  );
}
