import { notFound } from "next/navigation";
import { CircleUser, Lock, Users } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { AssignmentReveal } from "@/components/assignment-reveal";
import { BudgetBanner } from "@/components/budget-banner";
import { DrawPanel } from "@/components/draw-panel";
import { GroupSettingsDialog } from "@/components/group-settings-dialog";
import { RosterAdmin } from "@/components/roster-admin";
import { WishlistSection } from "@/components/wishlist-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminRoster, getGroupPageData, requireUser } from "@/lib/db";
import { displayName, groupByType } from "@/lib/format";
import type { AdminMember } from "@/lib/types";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/g/${id}`);

  const data = await getGroupPageData(id, user.id);
  // RLS hides groups I have nothing to do with, so "not visible" is a 404.
  if (!data) notFound();

  const { group, roster, myMember, isAdmin, assignment, myItems, targetItems } =
    data;
  if (!myMember && !isAdmin) notFound();

  const mine = groupByType(myItems);
  const theirs = groupByType(targetItems);

  // Only the admin tab needs the invite tokens, so only it pays for them.
  const adminMembers: AdminMember[] = isAdmin ? await getAdminRoster(id) : [];

  return (
    <>
      <AppHeader
        title={group.name}
        subtitle={`${roster.length} ${roster.length === 1 ? "parcero" : "parceros"} · ${
          group.status === "drawn" ? "sorteado" : "sin sortear"
        }`}
        backHref="/dashboard"
      />

      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-5">
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

          {/* --------------------------------------------------- my wishlist */}
          <TabsContent value="mi-lista" className="space-y-6 pt-4">
            {myMember ? (
              <>
                <WishlistSection
                  type="endulzada"
                  items={mine.endulzada}
                  groupId={group.id}
                  memberId={myMember.id}
                  budget={group.budget_endulzada}
                  currency={group.currency}
                  editable
                />
                <WishlistSection
                  type="regalo"
                  items={mine.regalo}
                  groupId={group.id}
                  memberId={myMember.id}
                  budget={group.budget_regalo}
                  currency={group.currency}
                  editable
                />
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  Administras este parche pero no tienes puesto en el sorteo,
                  así que no hay lista para llenar.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* -------------------------------------------------- my assignment */}
          <TabsContent value="mi-parcero" className="space-y-6 pt-4">
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
                <AssignmentReveal name={displayName(assignment)} />

                <Separator />

                <p className="text-muted-foreground text-sm">
                  Su lista de antojos:
                </p>

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
              </>
            )}
          </TabsContent>

          {/* -------------------------------------------------------- roster */}
          <TabsContent value="parche" className="space-y-5 pt-4">
            {isAdmin ? (
              <>
                <RosterAdmin
                  groupId={group.id}
                  members={adminMembers}
                  status={group.status}
                />
                <Separator />
                <DrawPanel
                  groupId={group.id}
                  status={group.status}
                  memberCount={roster.length}
                />
                <GroupSettingsDialog group={group} />
              </>
            ) : (
              <>
                <ul className="space-y-2">
                  {roster.map((member) => (
                    <li
                      key={member.id}
                      className="bg-card flex items-center gap-3 rounded-xl border p-3"
                    >
                      <CircleUser
                        className="text-muted-foreground size-5 shrink-0"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {member.shadow_name}
                      </span>
                      {member.id === myMember?.id && (
                        <Badge variant="secondary">Tú</Badge>
                      )}
                    </li>
                  ))}
                </ul>

                <Alert>
                  <Users className="size-4" aria-hidden />
                  <AlertDescription>
                    Solo el admin puede agregar gente y hacer el sorteo. Nadie,
                    ni el admin, puede ver los emparejamientos.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
