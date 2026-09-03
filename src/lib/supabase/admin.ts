import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

/**
 * Cliente con la llave de servicio: **salta RLS por completo**.
 *
 * ⚠️ Solo para el cron de recordatorios, que necesita ver los dispositivos de
 * todo el mundo para poder avisarles. No lo importes desde una página, un
 * componente ni una Server Action de usuario: ahí la autoridad tiene que
 * seguir siendo RLS con la sesión de quien pide.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` no lleva prefijo `NEXT_PUBLIC_`, así que nunca
 * llega al navegador. Si algún día este archivo termina en un bundle de
 * cliente, la variable saldría `undefined` y esto lanzaría — que es
 * justamente el comportamiento que se quiere.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY (o la URL). El cron de recordatorios no puede correr sin ella.",
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
