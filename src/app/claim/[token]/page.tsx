
import { ClaimForm } from "@/components/claim-form";
import { Logo } from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ButtonLink } from "@/components/button-link";
import { Card } from "@/components/ui/card";
import { getClaimPreview, getUser } from "@/lib/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The invite landing page. Readable while signed out — `get_claim_preview` is
 * the one RPC granted to `anon`, and it only returns the group name and the
 * seat label.
 */
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = UUID.test(token) ? await getClaimPreview(token) : null;
  const user = await getUser();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-14">
      <div className="flex justify-center">
        <Logo className="text-primary" markClassName="size-9" />
      </div>

      {!preview ? (
        <Card className="space-y-4 p-6 text-center">
          <h1 className="text-xl font-bold">Este enlace no sirve</h1>
          <p className="text-muted-foreground text-sm">
            Puede que esté mal copiado o que el parche ya no exista. Pídele al
            admin que te lo mande otra vez.
          </p>
          <ButtonLink href="/" variant="outline" className="w-full">
            Ir al inicio
          </ButtonLink>
        </Card>
      ) : (
        <Card className="space-y-4 p-6">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-bold">{preview.group_name}</h1>
            <p className="text-muted-foreground text-sm">
              Te invitaron como{" "}
              <strong className="text-foreground">{preview.shadow_name}</strong>
            </p>
          </div>

          {preview.claimed ? (
            <Alert>
              <AlertDescription>
                Este puesto ya fue reclamado. Si eras tú, entra con tu cuenta.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              {preview.status === "drawn"
                ? "El sorteo ya se hizo, pero tu puesto te espera — reclámalo y mira quién te salió."
                : "Reclama tu puesto y arma tu lista de antojos antes del sorteo."}
            </p>
          )}

          {user ? (
            <ClaimForm token={token} claimed={preview.claimed} />
          ) : (
            <div className="space-y-2">
              <ButtonLink
                href={`/login?mode=signup&next=${encodeURIComponent(`/claim/${token}`)}`}
                size="lg"
                className="w-full"
              >
                Crear cuenta y entrar
              </ButtonLink>
              <ButtonLink
                href={`/login?next=${encodeURIComponent(`/claim/${token}`)}`}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Ya tengo cuenta
              </ButtonLink>
            </div>
          )}
        </Card>
      )}
    </main>
  );
}
