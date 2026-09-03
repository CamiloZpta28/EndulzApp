import Link from "next/link";
import { Candy, ChevronRight, Sparkles } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { AutoRefresh } from "@/components/auto-refresh";
import { AvatarStack } from "@/components/avatar-stack";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getMyGroups, getProfile, requireUser } from "@/lib/db";
import { GroupDate } from "@/components/group-date";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [groups, profile] = await Promise.all([getMyGroups(), getProfile(user.id)]);

  const name =
    profile?.display_name?.trim() ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "amigo";

  return (
    <>
      <AutoRefresh />
      <AppHeader
        title="Mis grupos"
        subtitle={`Hola, ${name}`}
        me={{ name, avatarUrl: profile?.avatar_url ?? null }}
      />

      <main className="flex-1 py-5">
        <Shell width="wide" className="space-y-4">
          {groups.length === 0 ? (
            <Card className="mx-auto max-w-md space-y-3 p-6 text-center">
              <Candy className="text-primary mx-auto size-8" aria-hidden />
              <h2 className="font-semibold">Todavía no tienes ningún grupo</h2>
              <p className="text-muted-foreground text-sm">
                Crea uno y reparte el enlace — cada quien se agrega solo.
              </p>
            </Card>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => {
                const endulzada = group.next_endulzada;
                const reveal = group.reveal_at;

                return (
                  <li key={group.id}>
                    <Link href={`/g/${group.id}`} className="block h-full">
                      <Card className="hover:border-primary/50 h-full space-y-3 p-4 transition-colors">
                        <div className="flex items-center gap-3">
                          <span
                            className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl text-xl"
                            aria-hidden
                          >
                            {group.emoji || "🎁"}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2">
                              <span className="truncate font-semibold">
                                {group.name}
                              </span>
                              {group.is_admin && (
                                <Badge variant="outline" className="shrink-0">
                                  Admin
                                </Badge>
                              )}
                            </p>
                            <Badge
                              variant={
                                group.status === "drawn" ? "default" : "secondary"
                              }
                            >
                              {group.status === "drawn"
                                ? "Sorteado"
                                : "Sin sortear"}
                            </Badge>
                          </div>

                          <ChevronRight
                            className="text-muted-foreground size-5 shrink-0"
                            aria-hidden
                          />
                        </div>

                        <AvatarStack
                          members={group.members}
                          total={group.member_count}
                        />

                        {(endulzada || reveal) && (
                          <dl className="space-y-1 text-xs">
                            {endulzada && (
                              <div className="flex items-center gap-1.5">
                                <Candy
                                  className="size-3.5 shrink-0"
                                  style={{ color: "var(--endulzada)" }}
                                  aria-hidden
                                />
                                <dt className="text-muted-foreground">
                                  Siguiente endulzada
                                  {group.endulzada_count > 1 && (
                                    <span className="ml-1 opacity-70">
                                      (de {group.endulzada_count})
                                    </span>
                                  )}
                                </dt>
                                <dd className="ml-auto">
                                  <GroupDate value={endulzada} />
                                </dd>
                              </div>
                            )}
                            {reveal && (
                              <div className="flex items-center gap-1.5">
                                <Sparkles
                                  className="size-3.5 shrink-0"
                                  style={{ color: "var(--regalo)" }}
                                  aria-hidden
                                />
                                <dt className="text-muted-foreground">
                                  Descubrimiento
                                </dt>
                                <dd className="ml-auto">
                                  <GroupDate value={reveal} />
                                </dd>
                              </div>
                            )}
                          </dl>
                        )}
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mx-auto max-w-md pt-1">
            <CreateGroupDialog />
          </div>
        </Shell>
      </main>
    </>
  );
}
