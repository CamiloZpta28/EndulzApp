/**
 * Pure presentation helpers. Kept apart from `@/lib/db` on purpose: that
 * module reaches for `next/headers`, so importing it from a Client Component
 * breaks the build.
 */
import { DEFAULT_CURRENCY, currencyMeta } from "@/lib/currencies";
import type { WishlistType } from "@/lib/types";

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

/**
 * Split one wishlist into the two sections the UI renders. Es genérico porque
 * sirve tanto para la lista de un grupo como para la lista base del perfil,
 * que tienen columnas distintas pero el mismo `type`.
 */
export function groupByType<T extends { type: WishlistType }>(items: T[]) {
  const buckets: Record<WishlistType, T[]> = {
    endulzada: [],
    regalo: [],
    vetado: [],
  };
  for (const item of items) buckets[item.type].push(item);
  return buckets;
}

/**
 * Cumpleaños como "14 de marzo" — sin el año, que no es asunto del grupo.
 * La fecha llega como `YYYY-MM-DD`, así que se fija en UTC: interpretarla en
 * la zona local correría el día hacia atrás en cualquier huso al oeste de
 * Greenwich, Colombia incluida.
 */
export function formatBirthday(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Una fecha del grupo, en dos piezas: lo relativo ("en 8 días") y lo exacto
 * ("12 de sep"). Se devuelven aparte para que la UI decida cómo juntarlas —
 * lo relativo dice si urge, lo exacto sirve para anotarlo en el calendario, y
 * sin lo segundo hay que hacer la cuenta a mano.
 *
 * Se ancla a mediodía UTC porque la columna es `date`: leerla en la zona
 * local correría el día hacia atrás al oeste de Greenwich.
 */
export function formatGroupDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
  );
  const days = Math.round((date.getTime() - todayUtc) / 86_400_000);

  // `format()` en es-CO devuelve "11 de sept"; ese "de" hacía que la fecha se
  // partiera en dos líneas en la tarjeta. Se arma desde las partes para
  // quedarse con "11 sept".
  const parts = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = (parts.find((part) => part.type === "month")?.value ?? "")
    .replace(/\.$/, "");
  const absolute = `${day} ${month}`;

  let relative: string | null = null;
  if (days === 0) relative = "hoy";
  else if (days === 1) relative = "mañana";
  else if (days === -1) relative = "ayer";
  else if (days > 1 && days <= 30) relative = `en ${days} días`;
  else if (days < -1) relative = "ya pasó";

  return { relative, absolute, days };
}
