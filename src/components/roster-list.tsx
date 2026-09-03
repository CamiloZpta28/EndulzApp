"use client";

import { useActionState, useState } from "react";
import { Cake, Crown, IdCard, ListOrdered, Trash2 } from "lucide-react";

import { NicknameDialog } from "@/components/nickname-dialog";
import { PersonAvatar } from "@/components/person-avatar";
import { useActionToast } from "@/components/use-action-toast";
import { WishlistDialog } from "@/components/wishlist-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeMember } from "@/lib/actions/members";
import { idle } from "@/lib/actions/types";
import { formatBirthday } from "@/lib/format";
import type { RosterMember, WishlistItem } from "@/lib/types";

/**
 * Quiénes van en el grupo. En escritorio va en dos columnas — es una lista de
 * tarjetas cortas y apilarlas dejaba media pantalla vacía.
 *
 * Tocar una fila abre la lista de esa persona en una ventana flotante, con las
 * fotos. La previsualización de antes iba dentro de la fila y sin imágenes, y
 * así no servía: una lista de regalos se mira justo para ver cómo es la cosa.
 */
export function RosterList({
  groupId,
  members,
  canRemove,
  canRename,
  wishlists,
  currency,
  budgetEndulzada,
  budgetRegalo,
}: {
  groupId: string;
  members: RosterMember[];
  canRemove: boolean;
  /** El admin puede ponerle apodo a cualquiera; cada quien al suyo. */
  canRename: boolean;
  wishlists: Record<string, WishlistItem[]>;
  currency: string;
  budgetEndulzada: number;
  budgetRegalo: number;
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
          items={wishlists[member.member_id] ?? []}
          currency={currency}
          budgetEndulzada={budgetEndulzada}
          budgetRegalo={budgetRegalo}
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
  currency,
  budgetEndulzada,
  budgetRegalo,
}: {
  groupId: string;
  member: RosterMember;
  canRemove: boolean;
  canRename: boolean;
  items: WishlistItem[];
  currency: string;
  budgetEndulzada: number;
  budgetRegalo: number;
}) {
  const [listOpen, setListOpen] = useState(false);
  const [state, action] = useActionState(removeMember, idle);
  useActionToast(state);

  const birthday = formatBirthday(member.birthday);

  return (
    <li className="bg-card flex items-center gap-2 rounded-xl border p-3">
      {/* La fila entera abre la lista: el área de toque es toda la tarjeta,
          que en celular es lo que se alcanza con el pulgar. */}
      <button
        type="button"
        onClick={() => setListOpen(true)}
        className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:ring-3 focus-visible:outline-none"
        aria-label={`Ver la lista de ${member.name}`}
      >
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
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <ListOrdered className="size-3" aria-hidden />
              {items.length === 0
                ? "sin antojos"
                : items.length === 1
                  ? "1 antojo"
                  : `${items.length} antojos`}
            </span>
            {birthday && (
              <span className="inline-flex items-center gap-1">
                <Cake className="size-3" aria-hidden />
                {birthday}
              </span>
            )}
          </p>
        </div>
      </button>

      {member.is_me && <Badge variant="secondary">Tú</Badge>}

      <WishlistDialog
        personName={member.name}
        avatarUrl={member.avatar_url}
        items={items}
        currency={currency}
        budgetEndulzada={budgetEndulzada}
        budgetRegalo={budgetRegalo}
        open={listOpen}
        onOpenChange={setListOpen}
      />

      {canRename && (
        <NicknameDialog
          groupId={groupId}
          memberId={member.member_id}
          currentNickname={member.nickname}
          profileName={member.name}
          forSomeoneElse={!member.is_me}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={
                member.is_me
                  ? "Ponerme un apodo"
                  : `Ponerle un apodo a ${member.name}`
              }
            >
              <IdCard className="size-4" />
            </Button>
          }
        />
      )}

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
