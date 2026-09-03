import { Users } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { JoinConfirm } from "@/components/join-confirm";
import { Logo } from "@/components/logo";
import { PersonAvatar } from "@/components/person-avatar";
import { Shell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { getJoinDetails, getJoinPreview, getUser } from "@/lib/db";

/**
 * La página del enlace de invitación.
 *
 * Dos estados a propósito:
 *  - Sin sesión: solo el nombre del grupo, su emoji y cuántos van. Quien
 *    tiene el código todavía no ha demostrado ser del grupo, así que los
 *    nombres no se muestran (`get_join_preview` ni los devuelve).
 *  - Con sesión: la confirmación completa, con los integrantes.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getUser();

  const details = user ? await getJoinDetails(code) : null;
  const preview = details ? null : await getJoinPreview(code);

  const exists = Boolean(details ?? preview);
  const next = encodeURIComponent(`/join/${code}`);

  return (
    <main className="flex flex-1 flex-col justify-center py-12">
      <Shell width="narrow" className="space-y-6">
        <div className="flex justify-center">
          <Logo className="text-primary" markClassName="size-9" />
        </div>

        {!exists ? (
          <Card className="space-y-4 p-6 text-center">
            <h1 className="text-xl font-bold">Este enlace no sirve</h1>
            <p className="text-muted-foreground text-sm">
              Puede que esté mal copiado, que el admin lo haya cambiado, o que
              el grupo ya no exista. Pídele que te lo mande otra vez.
            </p>
            <ButtonLink href="/" variant="outline" className="w-full">
              Ir al inicio
            </ButtonLink>
          </Card>
        ) : details ? (
          /* -------------------------------------------- ya hay sesión */
          <Card className="space-y-5 p-6">
            <div className="space-y-2 text-center">
              {details.emoji && (
                <p className="text-5xl leading-none" aria-hidden>
                  {details.emoji}
                </p>
              )}
              <p className="text-muted-foreground text-sm">
                Te invitaron a este grupo
              </p>
              <h1 className="text-2xl font-bold">{details.group_name}</h1>
            </div>

            {details.members.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <Users className="size-3.5" aria-hidden />
                  {details.members.length}{" "}
                  {details.members.length === 1 ? "integrante" : "integrantes"}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {details.members.map((member, index) => (
                    <li
                      key={`${member.name}-${index}`}
                      className="bg-muted flex items-center gap-2 rounded-full py-1 pr-3 pl-1"
                    >
                      <PersonAvatar
                        name={member.name}
                        src={member.avatar_url}
                        size="sm"
                      />
                      <span className="text-sm font-medium">{member.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {details.already_member ? (
              <>
                <Alert>
                  <AlertDescription>
                    Ya estás en este grupo. No hay nada que confirmar.
                  </AlertDescription>
                </Alert>
                <ButtonLink
                  href={`/g/${details.group_id}`}
                  size="lg"
                  className="w-full"
                >
                  Entrar al grupo
                </ButtonLink>
              </>
            ) : details.status === "drawn" ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Este grupo ya hizo el sorteo, así que no se puede entrar.
                  Pídele al admin que lo reinicie si te quieren incluir.
                </AlertDescription>
              </Alert>
            ) : (
              <JoinConfirm code={code} groupName={details.group_name} />
            )}
          </Card>
        ) : (
          /* ------------------------------------------------ sin sesión */
          <Card className="space-y-5 p-6">
            <div className="space-y-2 text-center">
              {preview!.emoji && (
                <p className="text-5xl leading-none" aria-hidden>
                  {preview!.emoji}
                </p>
              )}
              <p className="text-muted-foreground text-sm">
                Te invitaron al amigo secreto de
              </p>
              <h1 className="text-2xl font-bold">{preview!.group_name}</h1>
              <p className="text-muted-foreground text-sm">
                {preview!.member_count === 1
                  ? "1 persona ya está adentro"
                  : `${preview!.member_count} personas ya están adentro`}
              </p>
            </div>

            {preview!.status === "drawn" ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Este grupo ya hizo el sorteo y no admite gente nueva.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <p className="text-muted-foreground text-center text-sm">
                  Entra con tu cuenta y te preguntamos si quieres unirte.
                </p>
                <div className="space-y-2">
                  <ButtonLink
                    href={`/login?mode=signup&next=${next}`}
                    size="lg"
                    className="w-full"
                  >
                    Crear mi cuenta
                  </ButtonLink>
                  <ButtonLink
                    href={`/login?next=${next}`}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Ya tengo cuenta
                  </ButtonLink>
                </div>
              </>
            )}
          </Card>
        )}
      </Shell>
    </main>
  );
}
