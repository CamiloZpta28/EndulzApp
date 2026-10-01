"use client";

import { useActionState, useState } from "react";
import { EyeOff, Package, Pencil, Settings2, Sparkles, Trash2 } from "lucide-react";

import { BudgetFields } from "@/components/budget-fields";
import { EmojiPicker } from "@/components/emoji-picker";
import { EndulzadaSchedule } from "@/components/endulzada-schedule";
import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { deleteGroup, updateGroup } from "@/lib/actions/groups";
import { idle } from "@/lib/actions/types";
import type { DeliveryMode, Group } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODES: {
  value: DeliveryMode;
  title: string;
  hint: string;
  icon: typeof Package;
}[] = [
  {
    value: "en_persona",
    title: "En persona",
    hint: "Se reúnen, todo va a una bolsa y cada quien saca la suya. Cada uno marca cuando la tiene lista.",
    icon: Package,
  },
  {
    value: "escondida",
    title: "A escondidas",
    hint: "Cada quien la deja donde pueda y avisa por la app dónde quedó, con foto si quiere. Sin decir quién es.",
    icon: EyeOff,
  },
];

/**
 * El modo de entrega. Solo sale si la columna existe (patch 012): si no, el
 * formulario no manda el campo y la acción no lo toca.
 */
function DeliveryModeField({ defaultValue }: { defaultValue: DeliveryMode }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">
        ¿Cómo se entregan las endulzadas?
      </legend>
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const active = value === mode.value;
        return (
          <label
            key={mode.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
            )}
          >
            <input
              type="radio"
              name="delivery_mode"
              value={mode.value}
              checked={active}
              onChange={() => setValue(mode.value)}
              className="accent-primary mt-1"
            />
            <span className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Icon className="size-3.5" aria-hidden />
                {mode.title}
              </span>
              <span className="text-muted-foreground block text-xs">
                {mode.hint}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/**
 * `variant` decide cómo se abre:
 *  - `"full"`: el botón ancho de la pestaña Grupo.
 *  - `"compact"`: el lápiz que va junto a los topes, arriba, que es donde
 *    uno los está leyendo cuando decide cambiarlos.
 * El contenido del diálogo es el mismo en los dos casos.
 */
export function GroupSettingsDialog({
  group,
  endulzadaDates = [],
  variant = "full",
}: {
  group: Group;
  /** Las fechas ya agendadas, en orden. */
  endulzadaDates?: string[];
  variant?: "full" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [state, formAction] = useActionState(updateGroup, idle);
  const [deleteState, deleteAction] = useActionState(deleteGroup, idle);

  useActionToast(state, () => setOpen(false));
  useActionToast(deleteState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          variant === "compact" ? (
            <Button variant="ghost" size="sm">
              <Pencil className="size-3.5" aria-hidden />
              Editar el grupo
            </Button>
          ) : (
            <Button variant="outline" className="w-full">
              <Settings2 className="size-4" aria-hidden />
              Ajustes del grupo
            </Button>
          )
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustes del grupo</DialogTitle>
          <DialogDescription>
            El nombre, el emoji y los topes se pueden cambiar cuando quieras,
            incluso después del sorteo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="group_id" value={group.id} />

          <div className="space-y-2">
            <Label htmlFor="settings-name">Nombre</Label>
            <Input
              id="settings-name"
              name="name"
              required
              maxLength={80}
              defaultValue={group.name}
            />
          </div>

          <EmojiPicker defaultValue={group.emoji} />

          <BudgetFields
            defaultCurrency={group.currency}
            defaultEndulzada={group.budget_endulzada}
            defaultRegalo={group.budget_regalo}
          />

          <EndulzadaSchedule defaultDates={endulzadaDates} />

          {group.delivery_mode && (
            <DeliveryModeField defaultValue={group.delivery_mode} />
          )}

          <div className="space-y-2">
            <Label htmlFor="settings-reveal-at" className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" style={{ color: "var(--regalo)" }} aria-hidden />
              Fecha del descubrimiento
            </Label>
            <Input
              id="settings-reveal-at"
              name="reveal_at"
              type="date"
              defaultValue={group.reveal_at ?? ""}
            />
          </div>

          <SubmitButton className="w-full" pendingLabel="Guardando…">
            Guardar cambios
          </SubmitButton>
        </form>

        <Separator />

        {confirmingDelete ? (
          <form action={deleteAction} className="space-y-2">
            <input type="hidden" name="group_id" value={group.id} />
            <p className="text-sm">
              Se borra el grupo completo: participantes, listas y el sorteo.
              Esto no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <SubmitButton
                variant="destructive"
                className="flex-1"
                pendingLabel="Borrando…"
              >
                Sí, borrar
              </SubmitButton>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                Mejor no
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-4" aria-hidden />
            Borrar el grupo
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
