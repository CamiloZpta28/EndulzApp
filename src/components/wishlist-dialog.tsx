"use client";

import Image from "next/image";
import { ExternalLink, ImageOff } from "lucide-react";
import type { ReactNode } from "react";

import { PersonAvatar } from "@/components/person-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney, groupByType } from "@/lib/format";
import { WISHLIST_META, WISHLIST_ORDER } from "@/lib/wishlist-meta";
import type { WishlistItem } from "@/lib/types";

/**
 * La lista de alguien, en una ventana flotante y con las fotos grandes.
 *
 * Antes esto era una previsualización de texto dentro de la fila del roster,
 * y sin las imágenes no servía de nada: uno mira una lista de regalos justo
 * para ver cómo es la cosa. Acá cada antojo va con su foto, su nota, su link
 * y su número de prioridad.
 *
 * `trigger` lo decide quien la usa: en el roster es la fila, y después de la
 * ruleta es el botón de "ver su lista".
 */
export function WishlistDialog({
  personName,
  avatarUrl,
  items,
  currency,
  budgetEndulzada,
  budgetRegalo,
  trigger,
  open,
  onOpenChange,
}: {
  personName: string;
  avatarUrl: string | null;
  items: WishlistItem[];
  currency: string;
  budgetEndulzada: number;
  budgetRegalo: number;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const lists = groupByType(items);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger as never} />}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <PersonAvatar name={personName} src={avatarUrl} />
            <span className="min-w-0 truncate">{personName}</span>
          </DialogTitle>
          <DialogDescription>
            {items.length === 0
              ? "Todavía no ha puesto nada en su lista."
              : "Arriba está lo que más quiere."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {WISHLIST_ORDER.map((type) => {
            const meta = WISHLIST_META[type];
            const Icon = meta.icon;
            const budget =
              type === "endulzada" ? budgetEndulzada : budgetRegalo;
            const section = lists[type];

            // La seccion de vetados solo sale si tiene algo: un "no hay
            // vetados" no le dice nada a quien viene a mirar que regalar.
            if (type === "vetado" && section.length === 0) return null;

            return (
              <section key={type} className="space-y-2">
                <h3
                  className="flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: meta.color }}
                >
                  <Icon className="size-4" aria-hidden />
                  {meta.label}
                  {meta.hasBudget ? (
                    budget > 0 && (
                      <span className="text-muted-foreground font-normal">
                        · hasta {formatMoney(budget, currency)}
                      </span>
                    )
                  ) : (
                    <span className="text-muted-foreground font-normal">
                      · mejor evitar
                    </span>
                  )}
                </h3>

                {section.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nada por acá todavía.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {section.map((item, index) => (
                      <li
                        key={item.id}
                        className="bg-muted/40 flex items-start gap-3 rounded-xl p-2"
                      >
                        <span className="text-muted-foreground w-4 shrink-0 pt-1 text-right text-xs font-semibold tabular-nums">
                          {index + 1}
                        </span>

                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt=""
                            width={80}
                            height={80}
                            unoptimized
                            className="size-20 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span
                            className="bg-muted text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-lg"
                            aria-hidden
                          >
                            <ImageOff className="size-5" />
                          </span>
                        )}

                        <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                          <p className="leading-snug font-medium">
                            {item.item_name}
                          </p>
                          {item.note && (
                            <p className="text-muted-foreground text-xs">
                              {item.note}
                            </p>
                          )}
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                            >
                              Ver el link
                              <ExternalLink className="size-3" aria-hidden />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
