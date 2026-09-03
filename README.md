# EndulzApp 🍬🎁

Amigo secreto (Secret Santa) para el parche, con dos presupuestos: la
**endulzada** (dulces y mecato durante el mes) y el **regalo** grande del final.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase
(Auth + Postgres + Storage) · listo para Vercel.

## Cómo funciona

- **Un enlace por parche.** `groups.invite_code` es un código de 8 caracteres
  sin letras ambiguas (sin I, O, 0, 1). Quien abre `/join/<code>` ve el parche,
  entra con su cuenta y confirma; `public.join_group()` le crea su propio
  puesto. El admin no escribe nombres a mano.
- **Perfil con lista base.** Foto, cumpleaños y celular en `/perfil`, más una
  wishlist privada (`profile_wishlists`) que se **copia** a cualquier parche con
  `public.import_profile_wishlist()`. Se copia y no se enlaza: ajustar la lista
  de un parche no le cambia el regalo a nadie más.
- **Sorteo con derangement.** `public.perform_draw()` acomoda los puestos en un
  único ciclo hamiltoniano al azar, así que nadie se saca a sí mismo, cada uno
  es sorteado exactamente una vez, y no quedan parejitas sueltas.
- **Nadie ve los emparejamientos.** `members.assigned_to` no tiene permiso de
  lectura para ningún rol de cliente — ni para el admin. La única puerta es
  `public.get_my_assignment()`, que solo devuelve tu propio resultado.

## Puesta en marcha

1. **Crea el proyecto en Supabase** y corre, en este orden y en el SQL editor:

   ```
   supabase/schema.sql
   supabase/patches/001-revoke-execute-from-public.sql
   supabase/patches/002-fix-rls-helper-execute.sql
   supabase/patches/003-perfiles-y-enlace-de-parche.sql
   ```

   Todos son idempotentes. Los patches no están plegados dentro de
   `schema.sql` a propósito: mantener las dos cosas en paralelo es cómo se
   terminan divergiendo.

2. **Variables de entorno** — copia `.env.example` a `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` salen de
   Project Settings → API.

3. **Correos de confirmación.** En Authentication → Email Templates, apunta el
   enlace de confirmación a:

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
   ```

   Para desarrollo también sirve apagar "Confirm email" en
   Authentication → Providers → Email: así el registro entra de una.

4. **Arranca:**

   ```bash
   npm run dev
   ```

## Estructura

```
supabase/schema.sql          tablas, RLS, grants por columna, RPCs, storage
src/proxy.ts                 refresca la sesión (era middleware.ts antes de Next 16)
src/lib/supabase/{server,client,env}.ts
src/lib/db.ts                capa de lectura (todo pasa por acá)
src/lib/format.ts            helpers puros — se pueden importar del cliente
src/lib/actions/*.ts         Server Actions: auth, groups, members, wishlists
src/lib/site.ts              el origen público, sacado de los headers
src/app/                     /, /login, /dashboard, /g/[id], /join/[code], /perfil
```

## Modelo de seguridad

RLS es la autoridad; los chequeos en TypeScript solo dan forma a la UI.

| Tabla       | Lectura                                        | Escritura                                          |
| ----------- | ---------------------------------------------- | -------------------------------------------------- |
| `profiles`  | solo el propio                                 | solo el propio                                     |
| `groups`    | admin o participante                           | solo admin (y solo `name` y presupuestos)          |
| `members`   | cualquiera del grupo, **sin** `assigned_to` ni `claim_token` | cada quien se une por enlace; el admin quita antes del sorteo |
| `wishlists` | la propia y la de quien te salió — nada más    | solo la propia                                     |
| `profile_wishlists` | solo la propia — nunca sale del perfil  | solo la propia                                     |

Nombres, fotos y cumpleaños de los del parche salen por `public.group_roster()`,
porque `profiles` solo deja leer la fila propia. El **celular no** va en ese
roster: queda privado.

Dos detalles que valen la pena:

- **RLS es por fila; el secreto acá es por columna.** Por eso el schema revoca
  `select` a nivel de tabla en `members` y lo vuelve a otorgar columna por
  columna, sin `assigned_to` ni `claim_token`. Un `select *` desde el cliente
  lo rechaza Postgres, no la app.
- **Las funciones helper son `security definer`** a propósito: sin eso, las
  políticas de `members` que consultan `members` se recursionan.

## Trampas que ya se pagaron

- **RLS es por fila; los helpers necesitan `EXECUTE`.** Una política se evalúa
  con los privilegios de quien consulta, no del dueño de la tabla. Revocarle
  `EXECUTE` a `is_group_member()` deja `SELECT` sobre `groups`, `members` y
  `wishlists` fallando con `42501`. Eso es lo que arregla el patch 002.
- **Postgres otorga `EXECUTE` a `PUBLIC`** en cada función nueva; `revoke ...
  from anon, authenticated` no toca ese grant. Hay que nombrar a `public`.
- **Nunca `parseFloat` sobre plata formateada.** `parseFloat("70.000")` da 70
  con separador de miles colombiano. Los montos viajan como dígitos puros.
- **shadcn en estilo `base-nova` corre sobre Base UI, no Radix.** No hay
  `asChild`, es `render={...}`, y un `Button` que rinde un `<a>` necesita
  `nativeButton={false}` (de ahí `ButtonLink`).
