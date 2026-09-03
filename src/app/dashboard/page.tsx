import Link from "next/link";
import { Candy, ChevronRight, Gift, Users } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getMyGroups, getProfile, requireUser } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [groups, profile] = await Promise.all([getMyGroups(), getProfile(user.id)]);

  const name =
    profile?.display_name?.trim() ||
    (user.user_metadata?.display_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "parcero";

  return (
    <>
      <AppHeader
        title="Mis parches"
        subtitle={`Hola, ${name}`}
        me={{ name, avatarUrl: profile?.avatar_url ?? null }}
      />

      <main className="flex-1 py-5">
        <Shell width="wide" className="space-y-4">
          {groups.length === 0 ? (
            <Card className="mx-auto max-w-md space-y-3 p-6 text-center">
              <Candy className="text-primary mx-auto size-8" aria-hidden />
              <h2 className="font-semibold">Todavía no tienes ningún parche</h2>
              <p className="text-muted-foreground text-sm">
                Crea uno y reparte el enlace — cada quien se agrega solo.
              </p>
            </Card>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <li key={group.id}>
                  <Link href={`/g/${group.id}`} className="block h-full">
                    <Card className="hover:border-primary/50 flex h-full flex-row items-center gap-3 p-4 transition-colors">
                      <span
                        className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl text-xl"
                        aria-hidden
                      >
                        {group.emoji || "🎁"}
                      </span>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold">
                            {group.name}
                          </span>
                          {group.is_admin && (
                            <Badge variant="outline" className="shrink-0">
                              Admin
                            </Badge>
                          )}
                        </div>

                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" aria-hidden />
                            {group.member_count}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Candy
                              className="size-3.5"
                              style={{ color: "var(--endulzada)" }}
                              aria-hidden
                            />
                            {formatMoney(group.budget_endulzada, group.currency)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Gift
                              className="size-3.5"
                              style={{ color: "var(--regalo)" }}
                              aria-hidden
                            />
                            {formatMoney(group.budget_regalo, group.currency)}
                          </span>
                        </div>

                        <Badge
                          variant={
                            group.status === "drawn" ? "default" : "secondary"
                          }
                        >
                          {group.status === "drawn" ? "Sorteado" : "Sin sortear"}
                        </Badge>
                      </div>

                      <ChevronRight
                        className="text-muted-foreground size-5 shrink-0"
                        aria-hidden
                      />
                    </Card>
                  </Link>
                </li>
              ))}
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
