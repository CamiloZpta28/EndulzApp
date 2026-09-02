"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { ExternalLink, Pencil, Trash2, X } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idle } from "@/lib/actions/types";
import {
  deleteWishlistItem,
  updateWishlistItem,
} from "@/lib/actions/wishlists";
import type { WishlistItem } from "@/lib/types";

export function WishlistItemRow({
  item,
  groupId,
  editable,
}: {
  item: WishlistItem;
  groupId: string;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction] = useActionState(updateWishlistItem, idle);
  const [deleteState, deleteAction] = useActionState(deleteWishlistItem, idle);

  useActionToast(updateState, () => setEditing(false));
  useActionToast(deleteState);

  if (editing) {
    return (
      <li className="bg-card rounded-xl border p-3">
        <form action={updateAction} className="space-y-3">
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="item_id" value={item.id} />

          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${item.id}`}>Antojo</Label>
            <Input
              id={`edit-name-${item.id}`}
              name="item_name"
              required
              maxLength={140}
              defaultValue={item.item_name}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-url-${item.id}`}>Link</Label>
            <Input
              id={`edit-url-${item.id}`}
              name="url"
              type="url"
              inputMode="url"
              defaultValue={item.url ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-note-${item.id}`}>Detalle</Label>
            <Textarea
              id={`edit-note-${item.id}`}
              name="note"
              rows={2}
              defaultValue={item.note ?? ""}
            />
          </div>

          <div className="flex gap-2">
            <SubmitButton className="flex-1" pendingLabel="Guardando…">
              Guardar
            </SubmitButton>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              <X className="size-4" aria-hidden />
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="bg-card flex items-start gap-3 rounded-xl border p-3">
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

      {editable && (
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
            <input type="hidden" name="group_id" value={groupId} />
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
      )}
    </li>
  );
}
