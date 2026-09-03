import { notFound } from "next/navigation";
import { CalendarPlus, Candy, Lock, Sparkles, Users } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { ButtonLink } from "@/components/button-link";
import { AssignmentGate } from "@/components/assignment-gate";
import { AutoRefresh } from "@/components/auto-refresh";
import { BudgetBanner } from "@/components/budget-banner";
import { DrawPanel } from "@/components/draw-panel";
import { GroupDate } from "@/components/group-date";
import { GroupSettingsDialog } from "@/components/group-settings-dialog";
import { ImportWishlistButton } from "@/components/import-wishlist-button";
import { InviteCard } from "@/components/invite-card";
import { RosterList } from "@/components/roster-list";
import { Shell } from "@/components/shell";
import { WishlistSection } from "@/components/wishlist-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGroupPageData, getProfile, requireUser } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site";
import { displayName, groupByType } from "@/lib/format";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/g/${id}`);

  const [data, profile, origin] = await Promise.all([
    getGroupPageData(id, user.id),
    getProfile(user.id),
    getSiteOrigin(),
  ]);
  // RLS hides groups I have nothing to do with, so "not visible" is a 404.
  if (!data) notFound();

  const {
    group,
    roster,
    myMember,
    isAdmin,
    assignment,
    myItems,
    targetItems,
    profileItemCount,
    endulzadas,
    visibleWishlists,
  } = data;
  if (!myMember && !isAdmin) notFound();

  const mine = groupByType(myItems);

  const me = {
    name: profile?.display_name?.trim() || user.email?.split("@")[0] || "Perfil",
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <>
      {/* Sin sortear el ritmo es más corto: cuando el admin sortea, a los
          demás les tiene que aparecer casi de una. */}
      <AutoRefresh intervalMs={group.status === "pending" ? 8000 : 30000} />
      <AppHeader
        title={group.name}
        emoji={group.emoji}
        subtitle={`${roster.length} ${roster.length === 1 ? "amigo" : "amigos"} · ${
          group.status === "drawn" ? "sorteado" : "sin sortear"
        }`}
        backHref="/dashboard"
        me={me}
      />

      <main className="flex-1 py-5">
        <Shell className="space-y-5">
          <BudgetBanner
            group={group}
            action={
              isAdmin ? (
                <GroupSettingsDialog
                  group={group}
                  endulzadaDates={endulzadas.map((e) => e.happens_on)}
                  variant="compact"
                />
              ) : null
            }
          />

          <Tabs defaultValue="parche">
            <TabsList className="w-full">
              <TabsTrigger value="parche">Grupo</TabsTrigger>
              <TabsTrigger value="mi-amigo">Me salió</TabsTrigger>
              <TabsTrigger value="mi-lista">Mi lista</TabsTrigger>
            </TabsList>

            {/* ------------------------------------------------- mi wishlist */}
            <TabsContent value="mi-lista" className="space-y-5 pt-4">
              {myMember ? (
                <>
                  <ImportWishlistButton
                    groupId={group.id}
                    memberId={myMember.member_id}
                    profileItemCount={profileItemCount}
                  />

                  {/* En escritorio las dos con tope van lado a lado. */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <WishlistSection
                      type="endulzada"
                      items={mine.endulzada}
                      groupId={group.id}
                      memberId={myMember.member_id}
                      budget={group.budget_endulzada}
                      currency={group.currency}
                      editable
                    />
                    <WishlistSection
                      type="regalo"
                      items={mine.regalo}
                      groupId={group.id}
                      memberId={myMember.member_id}
                      budget={group.budget_regalo}
                      currency={group.currency}
                      editable
                    />
                  </div>

                  {/* Los vetados van a lo ancho y al final: no compiten con
                      las dos listas de deseos, son una advertencia. */}
                  <WishlistSection
                    type="vetado"
                    items={mine.vetado}
                    groupId={group.id}
                    memberId={myMember.member_id}
                    budget={0}
                    currency={group.currency}
                    editable
                  />
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Administras este grupo pero no tienes puesto en el sorteo,
                    así que no hay lista para llenar. Ábrete el enlace de
                    invitación y únete como cualquier otro.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* ---------------------------------------------- a quién me salió */}
            <TabsContent value="mi-amigo" className="space-y-5 pt-4">
              {group.status !== "drawn" ? (
                <Alert>
                  <Lock className="size-4" aria-hidden />
                  <AlertDescription>
                    Todavía no hay sorteo. Cuando el admin lo haga, acá aparece a
                    quién le tienes que endulzar la vida.
                  </AlertDescription>
                </Alert>
              ) : !assignment ? (
                <Alert>
                  <AlertDescription>
                    El sorteo ya se hizo, pero no tienes puesto en él.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="mx-auto max-w-md">
                    <AssignmentGate
                      groupId={group.id}
                      name={displayName(assignment)}
                      avatarUrl={assignment.avatar_url}
                      alreadyRevealed={assignment.already_revealed}
                      roster={roster.map((m) => ({
                        name: m.name,
                        avatarUrl: m.avatar_url,
                      }))}
                      winnerIndex={roster.findIndex(
                        (m) => m.member_id === assignment.member_id,
                      )}
                      targetItems={targetItems}
                      currency={group.currency}
                      budgetEndulzada={group.budget_endulzada}
                      budgetRegalo={group.budget_regalo}
                    />
                  </div>

                </>
              )}
            </TabsContent>

            {/* --------------------------------------------------- el grupo */}
            <TabsContent value="parche" className="space-y-5 pt-4">
              {isAdmin && group.status === "pending" && (
                <InviteCard
                  groupId={group.id}
                  code={group.invite_code}
                  groupName={group.name}
                  origin={origin}
                />
              )}

              {(endulzadas.length > 0 || group.reveal_at) && (
                <div className="bg-card space-y-2 rounded-xl border p-4">
                  <h3 className="text-sm font-semibold">Fechas del grupo</h3>
                  <ul className="space-y-1.5 text-sm">
                    {endulzadas.map((endulzada, index) => (
                      <li key={endulzada.id} className="flex items-center gap-2">
                        <Candy
                          className="size-3.5 shrink-0"
                          style={{ color: "var(--endulzada)" }}
                          aria-hidden
                        />
                        <span className="text-muted-foreground">
                          Endulzada {index + 1}
                        </span>
                        <span className="ml-auto">
                          <GroupDate value={endulzada.happens_on} />
                        </span>
                      </li>
                    ))}
                    {group.reveal_at && (
                      <li className="flex items-center gap-2 border-t pt-1.5">
                        <Sparkles
                          className="size-3.5 shrink-0"
                          style={{ color: "var(--regalo)" }}
                          aria-hidden
                        />
                        <span className="text-muted-foreground">
                          Descubrimiento
                        </span>
                        <span className="ml-auto">
                          <GroupDate value={group.reveal_at} />
                        </span>
                      </li>
                    )}
                  </ul>

                  {/* El calendario del telefono avisa aunque no haya push:
                      sin permisos, sin app instalada y sin depender de que
                      este servidor este arriba. */}
                  <ButtonLink
                    href={`/g/${group.id}/calendario`}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <CalendarPlus className="size-3.5" aria-hidden />
                    Agregar al calendario
                  </ButtonLink>
                </div>
              )}

              <RosterList
                groupId={group.id}
                members={roster}
                canRemove={isAdmin && group.status === "pending"}
                canRename={isAdmin}
                wishlists={Object.fromEntries(visibleWishlists)}
                currency={group.currency}
                budgetEndulzada={group.budget_endulzada}
                budgetRegalo={group.budget_regalo}
              />

              {isAdmin ? (
                <>
                  <Separator />
                  <div className="mx-auto max-w-md space-y-3">
                    <DrawPanel
                      groupId={group.id}
                      status={group.status}
                      memberCount={roster.length}
                    />
                    <GroupSettingsDialog
                      group={group}
                      endulzadaDates={endulzadas.map((e) => e.happens_on)}
                    />
                  </div>
                </>
              ) : (
                <Alert>
                  <Users className="size-4" aria-hidden />
                  <AlertDescription>
                    Solo el admin hace el sorteo. Nadie, ni el admin, puede ver
                    los emparejamientos.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </Shell>
      </main>
    </>
  );
}
