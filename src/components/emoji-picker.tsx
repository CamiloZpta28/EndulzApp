"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Una rejilla de emojis con un campo libre al lado.
 *
 * Sin librería de emojis: un paquete completo pesa cientos de kilobytes y
 * traería un buscador que acá no hace falta. Estos son los que le sirven a un
 * grupo, y el campo libre acepta cualquier otro que la persona pegue.
 */
const SUGGESTED = [
  "🎁", "🍬", "🎄", "🍭", "🧁", "🎉", "🍫", "⭐",
  "🎅", "🦌", "🔔", "❄️", "🥳", "🍪", "🎊", "💝",
  "🏢", "🏠", "🎓", "⚽", "🍕", "☕", "🐶", "🌮",
];

export function EmojiPicker({
  name = "emoji",
  defaultValue,
}: {
  name?: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="space-y-2">
      <Label htmlFor={`${name}-libre`}>Emoji del grupo</Label>

      <div className="flex flex-wrap gap-1">
        {SUGGESTED.map((emoji) => {
          const selected = value === emoji;
          return (
            <button
              key={emoji}
              type="button"
              aria-pressed={selected}
              aria-label={`Usar ${emoji}`}
              onClick={() => setValue(selected ? "" : emoji)}
              className={cn(
                "focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-lg border text-lg transition-colors focus-visible:ring-3 focus-visible:outline-none",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-transparent hover:bg-muted",
              )}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Input
          id={`${name}-libre`}
          value={value}
          onChange={(event) => setValue([...event.target.value].slice(0, 8).join(""))}
          placeholder="O pega el que quieras"
          className="flex-1"
          autoComplete="off"
        />
        <span
          aria-hidden
          className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg text-lg"
        >
          {value || "·"}
        </span>
      </div>

      <input type="hidden" name={name} value={value} />
    </div>
  );
}
