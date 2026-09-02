"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, Pencil, Trash2, UserPlus, X } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addMembers, removeMember, renameMember } from "@/lib/actions/members";
import { idle } from "@/lib/actions/types";
import type { AdminMember, GroupStatus } from "@/lib/types";

/** Admin view of the roster: invite links, renames, removals. */
export function RosterAdmin({
  groupId,
  members,
  status,
}: {
  groupId: string;
  members: AdminMember[];
  status: GroupStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [addState, addAction] = useActionState(addMembers, idle);
  useActionToast(addState, () => formRef.current?.reset());

  const pending = status === "pending";

  return (
    <div className="space-y-5">
      {pending && (
        <form
          ref={formRef}
          action={addAction}
          className="bg-card space-y-3 rounded-xl border p-3"
        >
          <input type="hidden" name="group_id" value={groupId} />
          <div className="space-y-1.5">
            <Label htmlFor="names">Agregar parceros</Label>
            <Textarea
              id="names"
              name="names"
              rows={3}
              required
              placeholder={"Ana\nSebas\nLa profe Marta"}
            />
            <p className="text-muted-foreground text-xs">
              Un nombre por línea. No necesitan cuenta todavía — después les
              mandas su enlace.
            </p>
          </div>
          <SubmitButton className="w-full" pendingLabel="Agregando…">
            <UserPlus className="size-4" aria-hidden />
            Agregar al parche
          </SubmitButton>
        </form>
      )}

      <ul className="space-y-2">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            groupId={groupId}
            member={member}
            canEdit={pending}
          />
        ))}
      </ul>
    </div>
  );
}

function MemberRow({
  groupId,
  member,
  canEdit,
}: {
  groupId: string;
  member: AdminMember;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [renameState, renameAction] = useActionState(renameMember, idle);
  const [removeState, removeAction] = useActionState(removeMember, idle);

  useActionToast(renameState, () => setEditing(false));
  useActionToast(removeState);

  async function copyInvite() {
    const link = `${window.location.origin}/claim/${member.claim_token}`;
    try {
      // Checked here rather than during render: there is no `navigator`
      // while this component is server-rendered.
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Tu puesto en el amigo secreto",
          text: `${member.shadow_name}, reclama tu puesto:`,
          url: link,
        });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // User dismissed the share sheet, or the clipboard was blocked.
    }
  }

  if (editing) {
    return (
      <li className="bg-card rounded-xl border p-3">
        <form action={renameAction} className="flex items-end gap-2">
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="member_id" value={member.id} />
          <div className="flex-1 space-y-1.5">
            <Label htmlFor={`rename-${member.id}`}>Nombre</Label>
            <Input
              id={`rename-${member.id}`}
              name="shadow_name"
              required
              maxLength={60}
              defaultValue={member.shadow_name}
            />
          </div>
          <SubmitButton pendingLabel="…">Guardar</SubmitButton>
          <Button type="button" variant="ghost" size="icon" onClick={() => setEditing(false)}>
            <X className="size-4" />
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="bg-card flex items-center gap-2 rounded-xl border p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{member.shadow_name}</p>
        <Badge variant={member.claimed ? "secondary" : "outline"}>
          {member.claimed ? "Ya entró" : "Sin reclamar"}
        </Badge>
      </div>

      {!member.claimed && (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={copyInvite}
          aria-label={`Copiar el enlace de ${member.shadow_name}`}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      )}

      {canEdit && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label={`Renombrar ${member.shadow_name}`}
          >
            <Pencil className="size-4" />
          </Button>
          <form action={removeAction}>
            <input type="hidden" name="group_id" value={groupId} />
            <input type="hidden" name="member_id" value={member.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label={`Quitar ${member.shadow_name}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </form>
        </>
      )}
    </li>
  );
}
