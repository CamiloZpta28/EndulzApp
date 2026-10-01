"use client";

import { useActionState, useState } from "react";
import {
  Check,
  EyeOff,
  Gift,
  Package,
  PackageCheck,
  Pencil,
  Search,
  Undo2,
} from "lucide-react";

import { ImagePicker } from "@/components/image-picker";
import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  respondDelivery,
  saveDelivery,
  undoDelivery,
} from "@/lib/actions/deliveries";
import { idle } from "@/lib/actions/types";
import { formatGroupDate, pickCurrentEndulzada } from "@/lib/format";
import type { DeliveryMode, DeliveryStatus, GroupEndulzada } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Las entregas de endulzadas, en sus tres caras:
 *
 *  - `DeliveryPanel`: quien da, en "Me salió". "Ya la dejé" con mensaje y
 *    foto (a escondidas) o "Ya la tengo lista" (en persona).
 *  - `ReceivedDeliveries`: quien recibe, arriba en "Grupo". Solo a
 *    escondidas: en persona lo descubre en la reunión.
 *  - `DeliveryProgressCard`: el avance del grupo en modo en persona, para que
 *    el que organiza sepa cuántas faltan sin saber quién le da a quién.
 */

/** Una entrega como la necesita la UI: la foto ya viene como ruta de la app. */
export type DeliveryView = {
  delivery_id: string;
  endulzada_id: string;
  happens_on: string;
  message: string | null;
  photoUrl: string | null;
  status: DeliveryStatus;
  delivered_on: string;
};

function shortDate(value: string) {
  return formatGroupDate(value)?.absolute ?? value;
}

/** "hoy", "ayer", o la fecha. Nunca la hora: ver el patch 012. */
function deliveredWhen(value: string) {
  const parsed = formatGroupDate(value);
  if (!parsed) return value;
  if (parsed.days === 0) return "hoy";
  if (parsed.days === -1) return "ayer";
  return `el ${parsed.absolute}`;
}

function Photo({ src }: { src: string }) {
  return (
    <a href={src} target="_blank" rel="noopener" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Foto del escondite"
        className="max-h-72 w-full rounded-lg object-cover"
        style={{ maxWidth: "100%" }}
      />
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Quien da                                                                   */
/* -------------------------------------------------------------------------- */

export function DeliveryPanel({
  groupId,
  mode,
  endulzadas,
  given,
  recipientName,
  photosEnabled,
}: {
  groupId: string;
  mode: DeliveryMode;
  endulzadas: GroupEndulzada[];
  given: DeliveryView[];
  recipientName: string;
  photosEnabled: boolean;
}) {
  const [selectedId, setSelectedId] = useState(
    () => pickCurrentEndulzada(endulzadas)?.id ?? null,
  );
  const selected = endulzadas.find((e) => e.id === selectedId) ?? null;
  const delivery = given.find((d) => d.endulzada_id === selectedId) ?? null;

  if (endulzadas.length === 0) {
    return (
      <section className="bg-muted/40 space-y-1 rounded-xl border border-dashed p-4 text-center">
        <Package className="text-muted-foreground mx-auto size-6" aria-hidden />
        <p className="text-muted-foreground text-sm">
          Cuando el admin ponga las fechas de las endulzadas, acá vas a poder
          avisar que ya entregaste la tuya.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-card space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-1.5 font-semibold">
          <Gift className="size-4" style={{ color: "var(--endulzada)" }} aria-hidden />
          Tu entrega
        </h3>
        {endulzadas.length > 1 && (
          // Las fechas como fichas: así se ve de una en cuáles ya cumpliste.
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {endulzadas.map((endulzada) => {
              const done = given.some((d) => d.endulzada_id === endulzada.id);
              const active = endulzada.id === selectedId;
              return (
                <button
                  key={endulzada.id}
                  type="button"
                  onClick={() => setSelectedId(endulzada.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {done && <Check className="size-3" aria-label="ya entregada" />}
                  {shortDate(endulzada.happens_on)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected &&
        (mode === "escondida" ? (
          <HiddenDelivery
            // Remonta al cambiar de fecha: el formulario no arrastra lo
            // escrito para otra endulzada.
            key={selected.id}
            groupId={groupId}
            endulzada={selected}
            delivery={delivery}
            photosEnabled={photosEnabled}
          />
        ) : (
          <InPersonDelivery
            key={selected.id}
            groupId={groupId}
            endulzada={selected}
            delivery={delivery}
            recipientName={recipientName}
          />
        ))}
    </section>
  );
}

function HiddenDelivery({
  groupId,
  endulzada,
  delivery,
  photosEnabled,
}: {
  groupId: string;
  endulzada: GroupEndulzada;
  delivery: DeliveryView | null;
  photosEnabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [saveState, saveAction] = useActionState(saveDelivery, idle);
  const [undoState, undoAction] = useActionState(undoDelivery, idle);

  useActionToast(saveState, () => setEditing(false));
  useActionToast(undoState, () => setConfirmingUndo(false));

  const when = `la endulzada del ${shortDate(endulzada.happens_on)}`;

  if (!delivery && !editing) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          ¿Ya le dejaste {when}? Avísale dónde quedó.
        </p>
        <Button className="w-full" onClick={() => setEditing(true)}>
          <Package className="size-4" aria-hidden />
          Ya se la dejé
        </Button>
      </div>
    );
  }

  if (delivery && !editing) {
    const closed = delivery.status === "encontrada";
    return (
      <div className="space-y-3">
        <StatusLine status={delivery.status} />

        {delivery.message && (
          <p className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-line">
            {delivery.message}
          </p>
        )}
        {delivery.photoUrl && <Photo src={delivery.photoUrl} />}

        <p className="text-muted-foreground text-xs">
          Le avisaste {deliveredWhen(delivery.delivered_on)} para {when}.
        </p>

        {!closed &&
          (confirmingUndo ? (
            <form action={undoAction} className="space-y-2">
              <input type="hidden" name="group_id" value={groupId} />
              <input type="hidden" name="delivery_id" value={delivery.delivery_id} />
              <p className="text-sm">
                Se borra el aviso y la foto. Si ya lo vio, simplemente le
                desaparece.
              </p>
              <div className="flex gap-2">
                <SubmitButton
                  variant="destructive"
                  className="flex-1"
                  pendingLabel="Deshaciendo…"
                >
                  Sí, deshacer
                </SubmitButton>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmingUndo(false)}
                >
                  Mejor no
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex gap-2">
              <Button
                variant={delivery.status === "no_la_encuentro" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" aria-hidden />
                {delivery.status === "no_la_encuentro" ? "Darle otra pista" : "Editar"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingUndo(true)}>
                <Undo2 className="size-3.5" aria-hidden />
                Deshacer
              </Button>
            </div>
          ))}
      </div>
    );
  }

  return (
    <form action={saveAction} className="space-y-3">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="endulzada_id" value={endulzada.id} />
      <input type="hidden" name="mode" value="escondida" />

      <div className="space-y-1.5">
        <Label htmlFor={`entrega-${endulzada.id}`}>¿Dónde la dejaste?</Label>
        <Textarea
          id={`entrega-${endulzada.id}`}
          name="message"
          rows={3}
          maxLength={500}
          defaultValue={delivery?.message ?? ""}
          placeholder="En tu cajón, debajo del mouse pad 🤫"
          // Al abrir para editar, de una a escribir.
          autoFocus
        />
      </div>

      {photosEnabled && (
        <ImagePicker
          idPrefix={`entrega-${endulzada.id}`}
          existingUrl={delivery?.photoUrl ?? null}
          label="Foto del escondite (opcional)"
          allowUrl={false}
          strict
        />
      )}

      <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
        <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        No va a saber que fuiste tú. Ni la hora: solo ve el día. Ojo con lo que
        escribas, eso sí — tu forma de escribir también es una pista.
      </p>

      <div className="flex gap-2">
        <SubmitButton className="flex-1" pendingLabel="Avisando…">
          {delivery ? "Guardar cambios" : "Avisarle"}
        </SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function StatusLine({ status }: { status: DeliveryStatus }) {
  if (status === "encontrada") {
    return (
      <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        <PackageCheck className="size-4" aria-hidden />
        ¡La encontró! 🙌
      </p>
    );
  }
  if (status === "no_la_encuentro") {
    return (
      <p className="text-primary flex items-center gap-1.5 text-sm font-semibold">
        <Search className="size-4" aria-hidden />
        No la encuentra 😅 Dale otra pista.
      </p>
    );
  }
  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
      <Package className="size-4" aria-hidden />
      Avisada · esperando a que la encuentre
    </p>
  );
}

function InPersonDelivery({
  groupId,
  endulzada,
  delivery,
  recipientName,
}: {
  groupId: string;
  endulzada: GroupEndulzada;
  delivery: DeliveryView | null;
  recipientName: string;
}) {
  const [saveState, saveAction] = useActionState(saveDelivery, idle);
  const [undoState, undoAction] = useActionState(undoDelivery, idle);
  useActionToast(saveState);
  useActionToast(undoState);

  if (delivery) {
    return (
      <form action={undoAction} className="flex items-center gap-3">
        <input type="hidden" name="group_id" value={groupId} />
        <input type="hidden" name="delivery_id" value={delivery.delivery_id} />
        <p className="flex flex-1 items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <PackageCheck className="size-4" aria-hidden />
          Lista para el {shortDate(endulzada.happens_on)}
        </p>
        <SubmitButton variant="ghost" size="sm" pendingLabel="…">
          Desmarcar
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={saveAction} className="space-y-2">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="endulzada_id" value={endulzada.id} />
      <input type="hidden" name="mode" value="en_persona" />
      <p className="text-muted-foreground text-sm">
        Rotúlala para <strong className="text-foreground">{recipientName}</strong>{" "}
        y márcala cuando la tengas lista. El grupo solo ve cuántas van, no
        quién.
      </p>
      <SubmitButton className="w-full" pendingLabel="Marcando…">
        <PackageCheck className="size-4" aria-hidden />
        Ya la tengo lista
      </SubmitButton>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Quien recibe                                                               */
/* -------------------------------------------------------------------------- */

export function ReceivedDeliveries({
  groupId,
  received,
}: {
  groupId: string;
  received: DeliveryView[];
}) {
  if (received.length === 0) return null;

  // La más reciente arriba.
  const sorted = [...received].sort((a, b) =>
    b.happens_on.localeCompare(a.happens_on),
  );

  return (
    <div className="space-y-3">
      {sorted.map((delivery) => (
        <ReceivedCard key={delivery.delivery_id} groupId={groupId} delivery={delivery} />
      ))}
    </div>
  );
}

function ReceivedCard({
  groupId,
  delivery,
}: {
  groupId: string;
  delivery: DeliveryView;
}) {
  const [state, action] = useActionState(respondDelivery, idle);
  useActionToast(state);

  const found = delivery.status === "encontrada";

  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border p-4",
        found ? "bg-card" : "border-[var(--endulzada)]",
      )}
      style={found ? undefined : { backgroundColor: "var(--endulzada-soft)" }}
    >
      <div className="space-y-0.5">
        <h3
          className="flex items-center gap-1.5 font-semibold"
          style={{ color: found ? undefined : "var(--endulzada)" }}
        >
          {found ? (
            <PackageCheck className="size-4" aria-hidden />
          ) : (
            <Gift className="size-4" aria-hidden />
          )}
          {found ? "Ya la encontraste" : "¡Te dejaron una endulzada!"}
        </h3>
        <p className="text-muted-foreground text-xs">
          Endulzada del {shortDate(delivery.happens_on)} · la dejaron{" "}
          {deliveredWhen(delivery.delivered_on)}
        </p>
      </div>

      {delivery.message && (
        <p className="bg-background/70 rounded-lg p-3 text-sm whitespace-pre-line">
          {delivery.message}
        </p>
      )}
      {delivery.photoUrl && <Photo src={delivery.photoUrl} />}

      {/* Dos botones y nada más: responder no revela nada, porque quien la
          dejó ya sabe a quién se la dejó. */}
      <form action={action} className="flex gap-2">
        <input type="hidden" name="group_id" value={groupId} />
        <input type="hidden" name="delivery_id" value={delivery.delivery_id} />
        <Button
          type="submit"
          name="status"
          value="encontrada"
          variant={found ? "default" : "outline"}
          className="flex-1"
          aria-pressed={found}
        >
          <Check className="size-4" aria-hidden />
          ¡La encontré!
        </Button>
        <Button
          type="submit"
          name="status"
          value="no_la_encuentro"
          variant={delivery.status === "no_la_encuentro" ? "default" : "outline"}
          className="flex-1"
          aria-pressed={delivery.status === "no_la_encuentro"}
        >
          <Search className="size-4" aria-hidden />
          No la encuentro
        </Button>
      </form>

      {delivery.status === "no_la_encuentro" && (
        <p className="text-muted-foreground text-xs">
          Ya le avisamos. Cuando te dé otra pista, te llega acá.
        </p>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* El avance del grupo (en persona)                                           */
/* -------------------------------------------------------------------------- */

export function DeliveryProgressCard({
  progress,
}: {
  progress: { endulzada_id: string; happens_on: string; delivered: number; total: number }[];
}) {
  const current = pickCurrentEndulzada(progress);
  if (!current || current.total === 0) return null;

  const percent = Math.round((current.delivered / current.total) * 100);
  const complete = current.delivered >= current.total;

  return (
    <section className="bg-card space-y-2 rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Package className="size-4" style={{ color: "var(--endulzada)" }} aria-hidden />
          Endulzada del {shortDate(current.happens_on)}
        </h3>
        <span className="text-sm font-semibold tabular-nums">
          {current.delivered} de {current.total} listas
        </span>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={current.total}
        aria-valuenow={current.delivered}
        aria-label="Endulzadas listas"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: "var(--endulzada)" }}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        {complete
          ? "¡Ya están todas! A llenar la bolsa."
          : "Solo se ve cuántas van, no de quién son."}
      </p>
    </section>
  );
}
