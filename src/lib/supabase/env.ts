/**
 * Supabase project credentials.
 *
 * Supports both the legacy `ANON_KEY` name and the newer `PUBLISHABLE_KEY`
 * name so the app works on old and new Supabase projects alike.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan las variables de entorno de Supabase. Copia .env.example a .env.local y llénalas.",
    );
  }

  return { url, key };
}
