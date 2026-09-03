"use client";

import { useActionState, useState } from "react";
import {
  Cake,
  ChevronDown,
  Crown,
  Eye,
  Gift,
  Lock,
  Trash2,
} from "lucide-react";

import { NicknameDialog } from "@/components/nickname-dialog";
import { PersonAvatar } from "@/components/person-avatar";
import { useActionToast } from "@/components/use-action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeMember } from "@/lib/actions/members";
import { idle } from "@/lib/actions/types";
import { formatBirthday } from "@/lib/format";
import type { RosterMember, WishlistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Quiénes van en el grupo, con foto. En escritorio va en dos columnas — es
 * una lista de tarjetas cortas y apilarlas dejaba media pantalla vacía.
 *
 * Cada fila se abre para mostrar la lista de esa persona, pero solo si es
 * visible: RLS entrega únicamente la propia y la de quien te salió, así que
 * `wishlists` solo trae esas dos. A las demás la fila lo dice en vez de
 * mostrar un vacío que parecería un error.
 */
export function RosterList({
  groupId,
  members,
  canRemove,
  canRename,
  wishlists,
  drawn,
}: {
  groupId: string;
  members: RosterMember[];
  canRemove: boolean;
  /** El admin puede ponerle apodo a cualquiera; cada quien al suyo. */
  canRename: boolean;
  wishlists: Record<string, WishlistItem[]>;
  drawn: boolean;
}) {
  return (
    <ul className="grid items-start gap-2 md:grid-cols-2">
      {members.map((member) => (
        <RosterRow
          key={member.member_id}
          groupId={groupId}
          member={member}
          canRemove={canRemove && !member.is_me}
          canRename={canRename || member.is_me}
          items={wishlists[member.member_id]}
          drawn={drawn}
        />
      ))}
    </ul>
  );
}

function RosterRow({
  groupId,
  member,
  canRemove,
  canRename,
  items,
  drawn,
}: {
  groupId: string;
  member: RosterMember;
  canRemove: boolean;
  canRename: boolean;
  items?: WishlistItem[];
  drawn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(removeMember, idle);
  useActionToast(state);

  const birthday = formatBirthday(member.birthday);
  const visible = items !== undefined;

  return (
    <li className="bg-card rounded-xl border">
      <div className="flex items-center gap-3 p-3">
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
          {birthday && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Cake className="size-3" aria-hidden />
              {birthday}
            </p>
          )}
        </div>

        {member.is_me && <Badge variant="secondary">Tú</Badge>}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={`Ver la lista de ${member.name}`}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>

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
      </div>

      {open && (
        <div className="space-y-3 border-t p-3">
          {canRename && (
            <NicknameDialog
              groupId={groupId}
              memberId={member.member_id}
              currentNickname={member.nickname}
              profileName={member.name}
              forSomeoneElse={!member.is_me}
            />
          )}

          {visible ? (
            items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {member.is_me
                  ? "Todavía no has puesto nada en tu lista."
                  : "Todavía no ha puesto nada en su lista."}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {items.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-baseline gap-2 text-sm"
                  >
                    <span className="text-muted-foreground w-4 shrink-0 text-right text-xs tabular-nums">
                      {index + 1}.
                    </span>
                    {item.type === "endulzada" ? (
                      <Eye
                        className="size-3.5 shrink-0 translate-y-0.5"
                        style={{ color: "var(--endulzada)" }}
                        aria-label="Endulzada"
                      />
                    ) : (
                      <Gift
                        className="size-3.5 shrink-0 translate-y-0.5"
                        style={{ color: "var(--regalo)" }}
                        aria-label="Regalo"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      {item.item_name}
                      {item.note && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {item.note}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-muted-foreground flex items-start gap-1.5 text-sm">
              <Lock className="size-3.5 shrink-0 translate-y-0.5" aria-hidden />
              {drawn
                ? "Solo puedes ver la lista de quien te salió. Es lo que mantiene el secreto."
                : "Las listas se abren cuando el admin haga el sorteo."}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
