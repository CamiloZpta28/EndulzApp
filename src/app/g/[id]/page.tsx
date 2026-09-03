import { notFound } from "next/navigation";
import { Lock, Users } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { AssignmentReveal } from "@/components/assignment-reveal";
import { AutoRefresh } from "@/components/auto-refresh";
import { BudgetBanner } from "@/components/budget-banner";
import { DrawPanel } from "@/components/draw-panel";
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
  } = data;
  if (!myMember && !isAdmin) notFound();

  const mine = groupByType(myItems);
  const theirs = groupByType(targetItems);

  const me = {
    name: profile?.display_name?.trim() || user.email?.split("@")[0] || "Perfil",
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <>
      <AutoRefresh />
      <AppHeader
        title={group.name}
        emoji={group.emoji}
        subtitle={`${roster.length} ${roster.length === 1 ? "parcero" : "parceros"} · ${
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
                <GroupSettingsDialog group={group} variant="compact" />
              ) : null
            }
          />

          <Tabs defaultValue="mi-lista">
            <TabsList className="w-full">
              <TabsTrigger value="mi-lista">Mi lista</TabsTrigger>
              <TabsTrigger value="mi-parcero">Me salió</TabsTrigger>
              <TabsTrigger value="parche">Parche</TabsTrigger>
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

                  {/* En escritorio las dos secciones van lado a lado. */}
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
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Administras este parche pero no tienes puesto en el sorteo,
                    así que no hay lista para llenar. Ábrete el enlace de
                    invitación y únete como cualquier otro.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* ---------------------------------------------- a quién me salió */}
            <TabsContent value="mi-parcero" className="space-y-5 pt-4">
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
                    <AssignmentReveal
                      name={displayName(assignment)}
                      avatarUrl={assignment.avatar_url}
                    />
                  </div>

                  <Separator />

                  <p className="text-muted-foreground text-sm">
                    Su lista de antojos:
                  </p>

                  <div className="grid gap-6 md:grid-cols-2">
                    <WishlistSection
                      type="endulzada"
                      items={theirs.endulzada}
                      groupId={group.id}
                      memberId={assignment.member_id}
                      budget={group.budget_endulzada}
                      currency={group.currency}
                      editable={false}
                    />
                    <WishlistSection
                      type="regalo"
                      items={theirs.regalo}
                      groupId={group.id}
                      memberId={assignment.member_id}
                      budget={group.budget_regalo}
                      currency={group.currency}
                      editable={false}
                    />
                  </div>
                </>
              )}
            </TabsContent>

            {/* --------------------------------------------------- el parche */}
            <TabsContent value="parche" className="space-y-5 pt-4">
              {isAdmin && group.status === "pending" && (
                <InviteCard
                  groupId={group.id}
                  code={group.invite_code}
                  groupName={group.name}
                  origin={origin}
                />
              )}

              <RosterList
                groupId={group.id}
                members={roster}
                canRemove={isAdmin && group.status === "pending"}
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
                    <GroupSettingsDialog group={group} />
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
