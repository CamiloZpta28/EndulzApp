"use client";

import { useActionState, useState } from "react";
import { Check, Link2, RefreshCw, Share2 } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import { rotateInviteCode } from "@/lib/actions/members";
import { idle } from "@/lib/actions/types";

/**
 * El enlace del parche. Es la única forma de entrar: cada persona se agrega a
 * sí misma, así que el admin solo tiene que repartir esto.
 *
 * La URL viene armada desde el servidor (a partir de los headers de la
 * petición), así sale correcta en localhost, en un preview de Vercel y en
 * producción, y aparece ya en el HTML sin esperar a que hidrate.
 */
export function InviteCard({
  groupId,
  code,
  groupName,
  origin,
}: {
  groupId: string;
  code: string;
  groupName: string;
  origin: string;
}) {
  const link = `${origin}/join/${code}`;
  const [copied, setCopied] = useState(false);
  const [rotateState, rotateAction] = useActionState(rotateInviteCode, idle);

  useActionToast(rotateState);

  async function share() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: `Únete a ${groupName}`,
          text: `Te invito al amigo secreto de ${groupName}:`,
          url: link,
        });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Cerraron la hoja de compartir, o el portapapeles está bloqueado.
    }
  }

  return (
    <div className="bg-card space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 font-semibold">
          <Link2 className="text-primary size-4" aria-hidden />
          Enlace del parche
        </h3>
        <p className="text-muted-foreground text-sm">
          Mándalo por donde quieras. Quien lo abra crea su cuenta (o entra con
          la que tenga) y confirma si se une.
        </p>
      </div>

      <p className="bg-muted text-muted-foreground overflow-x-auto rounded-lg px-3 py-2 font-mono text-xs whitespace-nowrap">
        {link}
      </p>

      <div className="flex gap-2">
        <Button type="button" onClick={share} className="flex-1">
          {copied ? (
            <>
              <Check className="size-4" aria-hidden />
              ¡Copiado!
            </>
          ) : (
            <>
              <Share2 className="size-4" aria-hidden />
              Compartir enlace
            </>
          )}
        </Button>

        <form action={rotateAction}>
          <input type="hidden" name="group_id" value={groupId} />
          <SubmitButton
            variant="outline"
            size="icon"
            pendingLabel=""
            aria-label="Generar un enlace nuevo"
          >
            <RefreshCw className="size-4" />
          </SubmitButton>
        </form>
      </div>

      <p className="text-muted-foreground text-xs">
        Si el enlace se fue al grupo equivocado, genera uno nuevo con{" "}
        <RefreshCw className="inline size-3" aria-hidden /> — el anterior deja
        de servir.
      </p>
    </div>
  );
}
