/**
 * Pure presentation helpers. Kept apart from `@/lib/db` on purpose: that
 * module reaches for `next/headers`, so importing it from a Client Component
 * breaks the build.
 */
import { DEFAULT_CURRENCY, currencyMeta } from "@/lib/currencies";
import type { WishlistItem, WishlistType } from "@/lib/types";

/**
 * Monto con símbolo y separadores de miles de la moneda que corresponde.
 * `currency` es `string` y no `CurrencyCode` porque llega de la base de datos:
 * `currencyMeta` se encarga de un código desconocido.
 */
export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY) {
  const meta = currencyMeta(currency);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Un código que Intl no conozca lo haría lanzar; caemos a algo legible.
    return `${meta.symbol} ${Math.round(amount).toLocaleString(meta.locale)}`;
  }
}

/** Prefer a claimed account's real name over the seat label the admin typed. */
export function displayName(member: {
  shadow_name: string;
  display_name?: string | null;
}) {
  return member.display_name?.trim() || member.shadow_name;
}

/** Split one wishlist into the two sections the UI renders. */
export function groupByType(items: WishlistItem[]) {
  const buckets: Record<WishlistType, WishlistItem[]> = {
    endulzada: [],
    regalo: [],
  };
  for (const item of items) buckets[item.type].push(item);
  return buckets;
}
