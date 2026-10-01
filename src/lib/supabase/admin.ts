import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

/**
 * Cliente con la llave de servicio: **salta RLS por completo**.
 *
 * ⚠️ Lo usan dos cosas, y nada más:
 *  - el cron de recordatorios, que necesita ver los dispositivos de todo el
 *    mundo para poder avisarles;
 *  - las entregas anónimas (`lib/delivery-photos.ts` y los avisos push), que
 *    guardan fotos en un bucket sin políticas y le avisan a la otra persona.
 *
 * En el segundo caso la autoridad NO es esta llave: siempre se llama primero
 * una función con la sesión de quien pide, que confirma que la entrega es
 * suya, y solo después esta llave toca el archivo o manda el push. No la uses
 * para decidir quién puede qué: para eso siguen estando RLS y la sesión.
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
      "Falta SUPABASE_SERVICE_ROLE_KEY (o la URL). Sin ella no corren los recordatorios ni las fotos de las entregas.",
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
