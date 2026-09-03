/**
 * Las monedas que ofrece el desplegable.
 *
 * `locale` define cómo se agrupan los miles al escribir y al mostrar. Los
 * montos se manejan como enteros a propósito: un tope de amigo secreto es un
 * número redondo, y aceptar decimales obliga a adivinar si un "." es
 * separador de miles o de decimales — que fue exactamente el bug original.
 */
export const CURRENCIES = [
  { code: "COP", label: "Peso colombiano", symbol: "$", locale: "es-CO" },
  { code: "USD", label: "Dólar", symbol: "US$", locale: "en-US" },
  { code: "EUR", label: "Euro", symbol: "€", locale: "es-ES" },
  { code: "MXN", label: "Peso mexicano", symbol: "MX$", locale: "es-MX" },
  { code: "ARS", label: "Peso argentino", symbol: "AR$", locale: "es-AR" },
  { code: "CLP", label: "Peso chileno", symbol: "CL$", locale: "es-CL" },
  { code: "PEN", label: "Sol", symbol: "S/", locale: "es-PE" },
  { code: "BRL", label: "Real", symbol: "R$", locale: "pt-BR" },
  { code: "GBP", label: "Libra", symbol: "£", locale: "en-GB" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const DEFAULT_CURRENCY: CurrencyCode = "COP";

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currencyMeta(code: string) {
  return BY_CODE.get(code as CurrencyCode) ?? BY_CODE.get(DEFAULT_CURRENCY)!;
}

/** Guarda contra códigos inventados llegando desde un `FormData`. */
export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && BY_CODE.has(value as CurrencyCode);
}

/**
 * Digitos → entero. Tolera cualquier cosa que el usuario haya escrito
 * (símbolos, puntos, comas, espacios) porque solo se queda con los dígitos.
 * El techo es el de `numeric(12, 2)`.
 */
export const MAX_BUDGET = 9_999_999_999;

export function parseMoney(value: unknown): number {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, MAX_BUDGET);
}

/** Agrupa los miles según la moneda, sin símbolo. Para el input mientras se escribe. */
export function groupDigits(digits: string, code: string) {
  if (!digits) return "";
  const amount = Number.parseInt(digits, 10);
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat(currencyMeta(code).locale, {
    maximumFractionDigits: 0,
  }).format(amount);
}
