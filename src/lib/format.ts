/**
 * Pure presentation helpers. Kept apart from `@/lib/db` on purpose: that
 * module reaches for `next/headers`, so importing it from a Client Component
 * breaks the build.
 */
import type { WishlistItem, WishlistType } from "@/lib/types";

export function formatMoney(amount: number, currency = "COP") {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unknown 3-letter code makes Intl throw; fall back to a plain number.
    return `${currency} ${Math.round(amount).toLocaleString("es-CO")}`;
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
