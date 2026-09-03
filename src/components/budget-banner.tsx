import type { ReactNode } from "react";
import { Candy, Gift } from "lucide-react";

import { formatMoney } from "@/lib/format";
import type { Group } from "@/lib/types";

/**
 * The two spending caps, side by side. Deliberately loud: the whole point of
 * the app is that nobody has to ask "¿de cuánto era?".
 *
 * `action` is where the admin's edit affordance goes. It lives here rather
 * than only in the settings tab because this is where the numbers are read,
 * so this is where you reach to change them.
 */
export function BudgetBanner({
  group,
  action,
}: {
  group: Group;
  action?: ReactNode;
}) {
  const caps = [
    {
      icon: Candy,
      label: "Endulzada",
      amount: group.budget_endulzada,
      color: "var(--endulzada)",
      soft: "var(--endulzada-soft)",
    },
    {
      icon: Gift,
      label: "Regalo",
      amount: group.budget_regalo,
      color: "var(--regalo)",
      soft: "var(--regalo-soft)",
    },
  ];

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Topes del parche
        </h2>
        {action}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {caps.map(({ icon: Icon, label, amount, color, soft }) => (
          <div
            key={label}
            className="rounded-xl border p-3"
            style={{ backgroundColor: soft, borderColor: color }}
          >
            <p
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color }}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </p>
            <p className="mt-1 text-lg leading-tight font-bold tabular-nums">
              {amount > 0 ? formatMoney(amount, group.currency) : "Sin tope"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
