"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { ExternalLink, Pencil, Trash2, X } from "lucide-react";

import { ImagePicker } from "@/components/image-picker";
import { PriorityControls } from "@/components/priority-controls";
import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProfileItem,
  updateProfileItem,
} from "@/lib/actions/profile";
import { idle } from "@/lib/actions/types";
import type { ProfileWishlistItem } from "@/lib/types";

/**
 * Una fila de la lista base: se puede editar, borrar y mover de prioridad.
 *
 * Antes esta lista solo tenía botón de borrar, así que corregir una falta de
 * ortografía obligaba a rehacer el antojo con su foto y todo.
 */
export function ProfileItemRow({
  item,
  priority,
}: {
  item: ProfileWishlistItem;
  priority?: { ids: string[]; index: number };
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction] = useActionState(updateProfileItem, idle);
  const [deleteState, deleteAction] = useActionState(deleteProfileItem, idle);

  useActionToast(updateState, () => setEditing(false));
  useActionToast(deleteState);

  if (editing) {
    return (
      <li className="bg-card rounded-xl border p-3">
        <form action={updateAction} className="space-y-3">
          <input type="hidden" name="item_id" value={item.id} />

          <div className="space-y-1.5">
            <Label htmlFor={`pw-name-${item.id}`}>Antojo</Label>
            <Input
              id={`pw-name-${item.id}`}
              name="item_name"
              required
              maxLength={140}
              defaultValue={item.item_name}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`pw-url-${item.id}`}>Link</Label>
            <Input
              id={`pw-url-${item.id}`}
              name="url"
              type="url"
              inputMode="url"
              defaultValue={item.url ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`pw-note-${item.id}`}>Detalle</Label>
            <Textarea
              id={`pw-note-${item.id}`}
              name="note"
              rows={2}
              defaultValue={item.note ?? ""}
            />
          </div>

          <ImagePicker idPrefix={`pw-editar-${item.id}`} />

          <div className="flex gap-2">
            <SubmitButton className="flex-1" pendingLabel="Guardando…">
              Guardar
            </SubmitButton>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              <X className="size-4" aria-hidden />
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="bg-card flex items-start gap-2 rounded-xl border p-3">
      {priority && (
        <PriorityControls
          ids={priority.ids}
          index={priority.index}
          scope={{ kind: "profile", type: item.type }}
        />
      )}

      {item.image_url && (
        <Image
          src={item.image_url}
          alt=""
          width={56}
          height={56}
          unoptimized
          className="size-14 shrink-0 rounded-lg object-cover"
        />
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <p className="leading-snug font-medium">{item.item_name}</p>
        {item.note && (
          <p className="text-muted-foreground text-xs">{item.note}</p>
        )}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
          >
            Ver el link
            <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>

      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${item.item_name}`}
        >
          <Pencil className="size-4" />
        </Button>
        <form action={deleteAction}>
          <input type="hidden" name="item_id" value={item.id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label={`Quitar ${item.item_name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </form>
      </div>
    </li>
  );
}
