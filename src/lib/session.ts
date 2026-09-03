import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

/**
 * Quién es el que está pidiendo, verificado.
 *
 * Usa `getClaims()` en vez de `getUser()`: este proyecto firma los JWT con
 * ES256, así que la verificación se hace **local** con WebCrypto contra el
 * JWKS cacheado, sin viaje a Supabase. `getUser()` en cambio pregunta al
 * servidor de Auth en cada llamada, y entre el proxy y la página eso eran dos
 * viajes por navegación — el piso de ~850 ms que se sentía como lentitud.
 *
 * No pierde nada: `getClaims()` valida la firma igual (no se confía del
 * contenido de la cookie) y refresca la sesión si el token está por vencer.
 * Si el proyecto volviera a una llave simétrica, la propia librería cae a
 * preguntarle al servidor.
 */
export async function getSessionUser(
  supabase: SupabaseClient<Database>,
): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const claims = data.claims;
  const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const fromMetadata = metadata.display_name;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    displayName: typeof fromMetadata === "string" ? fromMetadata : null,
  };
}
