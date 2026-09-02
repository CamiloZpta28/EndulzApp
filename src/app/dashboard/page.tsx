import Link from "next/link";
import { Candy, ChevronRight, Gift, Users } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getMyGroups, requireUser } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const groups = await getMyGroups();

  const greeting =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "parcero";

  return (
    <>
      <AppHeader title="Mis parches" subtitle={`Hola, ${greeting}`} />

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-5">
        {groups.length === 0 ? (
          <Card className="space-y-3 p-6 text-center">
            <Candy className="text-primary mx-auto size-8" aria-hidden />
            <h2 className="font-semibold">Todavía no tienes ningún parche</h2>
            <p className="text-muted-foreground text-sm">
              Crea uno, agrega a los parceros por nombre y mándales su enlace.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li key={group.id}>
                <Link href={`/g/${group.id}`} className="block">
                  <Card className="hover:border-primary/50 flex flex-row items-center gap-3 p-4 transition-colors">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{group.name}</span>
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
                        variant={group.status === "drawn" ? "default" : "secondary"}
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

        <CreateGroupDialog />
      </main>
    </>
  );
}
