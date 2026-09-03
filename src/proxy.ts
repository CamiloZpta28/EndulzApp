import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";

/**
 * In Next.js 16 `middleware.ts` is called `proxy.ts` and the named export is
 * `proxy`. Its only job here is refreshing the Supabase auth cookies so
 * Server Components never see an expired token.
 *
 * Route protection lives in the pages and Server Actions, not here — this is
 * an optimistic pass, per the Next.js authentication guide.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Esta llamada es la que refresca el token; no se puede quitar.
  //
  // `getClaims()` y no `getUser()`: con las llaves ES256 de este proyecto la
  // verificación es local (WebCrypto + JWKS cacheado) y solo sale a la red
  // cuando de verdad hay que refrescar. `getUser()` preguntaba al servidor de
  // Auth en cada request, y el proxy corre en todas.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    /*
     * Todo menos los estáticos, las imágenes y las rutas de metadatos
     * (`/icon`, `/apple-icon`, el manifest). Esas últimas no llevan sesión,
     * así que revisarla ahí era trabajo perdido en cada carga.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
