import Link from "next/link";
import { Candy, ChevronRight, Sparkles } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { AutoRefresh } from "@/components/auto-refresh";
import { AvatarStack } from "@/components/avatar-stack";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getMyGroups,
  getProfile,
  getProfileWishlistCount,
  requireUser,
} from "@/lib/db";
import { GroupDate } from "@/components/group-date";
import { HowItWorksButton, OnboardingCard } from "@/components/onboarding-tour";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [groups, profile, baseItemCount] = await Promise.all([
    getMyGroups(),
    getProfile(user.id),
    getProfileWishlistCount(),
  ]);

  const name =
    profile?.display_name?.trim() ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "amigo";

  // Sin grupos y sin lista base = cuenta recién creada, todavía no ha hecho
  // nada. Es una señal mejor que la fecha de registro: quien ya armó su lista
  // o ya estuvo en un grupo no necesita que le expliquen, aunque se haya
  // salido de todo; y sirve igual en cualquier dispositivo, mientras que lo
  // guardado en el navegador solo cubre el que se usó para cerrarla.
  const cuentaNueva = groups.length === 0 && baseItemCount === 0;

  const sinGrupos = (
    <Card className="mx-auto max-w-md space-y-3 p-6 text-center">
      <Candy className="text-primary mx-auto size-8" aria-hidden />
      <h2 className="font-semibold">Todavía no tienes ningún grupo</h2>
      <p className="text-muted-foreground text-sm">
        Crea uno y reparte el enlace — cada quien se agrega solo.
      </p>
    </Card>
  );

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
          {cuentaNueva ? (
            <OnboardingCard whenDismissed={sinGrupos} />
          ) : groups.length === 0 ? (
            sinGrupos
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
                              <div className="flex items-baseline justify-between gap-2">
                                <dt className="text-muted-foreground flex min-w-0 items-baseline gap-1.5 truncate">
                                  <Candy
                                    className="size-3.5 shrink-0 translate-y-0.5"
                                    style={{ color: "var(--endulzada)" }}
                                    aria-hidden
                                  />
                                  <span className="truncate">
                                    Próxima endulzada
                                  </span>
                                </dt>
                                <dd className="shrink-0 whitespace-nowrap">
                                  <GroupDate value={endulzada} />
                                </dd>
                              </div>
                            )}
                            {reveal && (
                              <div className="flex items-baseline justify-between gap-2">
                                <dt className="text-muted-foreground flex min-w-0 items-baseline gap-1.5 truncate">
                                  <Sparkles
                                    className="size-3.5 shrink-0 translate-y-0.5"
                                    style={{ color: "var(--regalo)" }}
                                    aria-hidden
                                  />
                                  <span className="truncate">Descubrimiento</span>
                                </dt>
                                <dd className="shrink-0 whitespace-nowrap">
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

          <div className="mx-auto max-w-md space-y-1 pt-1">
            <CreateGroupDialog />
            {/* El tutorial se cierra para siempre; esto es la puerta de vuelta
                para quien lo cerró de afán o llegó tarde a la app. */}
            <div className="text-center">
              <HowItWorksButton />
            </div>
          </div>
        </Shell>
      </main>
    </>
  );
}
