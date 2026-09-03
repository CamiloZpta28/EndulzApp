"use client";

import { useActionState } from "react";
import { Cake, Crown, Trash2 } from "lucide-react";

import { PersonAvatar } from "@/components/person-avatar";
import { useActionToast } from "@/components/use-action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeMember } from "@/lib/actions/members";
import { idle } from "@/lib/actions/types";
import { formatBirthday } from "@/lib/format";
import type { RosterMember } from "@/lib/types";

/**
 * Quiénes van en el parche, con foto. En escritorio va en dos columnas — es
 * una lista de tarjetas cortas y apilarlas dejaba media pantalla vacía.
 */
export function RosterList({
  groupId,
  members,
  canRemove,
}: {
  groupId: string;
  members: RosterMember[];
  canRemove: boolean;
}) {
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {members.map((member) => (
        <RosterRow
          key={member.member_id}
          groupId={groupId}
          member={member}
          canRemove={canRemove && !member.is_me}
        />
      ))}
    </ul>
  );
}

function RosterRow({
  groupId,
  member,
  canRemove,
}: {
  groupId: string;
  member: RosterMember;
  canRemove: boolean;
}) {
  const [state, action] = useActionState(removeMember, idle);
  useActionToast(state);

  const birthday = formatBirthday(member.birthday);

  return (
    <li className="bg-card flex items-center gap-3 rounded-xl border p-3">
      <PersonAvatar name={member.name} src={member.avatar_url} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-medium">
          <span className="truncate">{member.name}</span>
          {member.is_admin && (
            <Crown
              className="size-3.5 shrink-0"
              style={{ color: "var(--endulzada)" }}
              aria-label="Admin"
            />
          )}
        </p>
        {birthday ? (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Cake className="size-3" aria-hidden />
            {birthday}
          </p>
        ) : (
          !member.user_id && (
            <p className="text-muted-foreground text-xs">Sin cuenta todavía</p>
          )
        )}
      </div>

      {member.is_me && <Badge variant="secondary">Tú</Badge>}

      {canRemove && (
        <form action={action}>
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="member_id" value={member.member_id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label={`Quitar a ${member.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </form>
      )}
    </li>
  );
}
