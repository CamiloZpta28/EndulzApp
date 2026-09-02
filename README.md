# EndulzApp 🍬🎁

Amigo secreto (Secret Santa) para el parche, con dos presupuestos: la
**endulzada** (dulces y mecato durante el mes) y el **regalo** grande del final.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase
(Auth + Postgres + Storage) · listo para Vercel.

## Cómo funciona

- **Perfiles fantasma.** El admin agrega participantes escribiendo nombres, sin
  cuentas. Cada puesto trae un `claim_token`; el enlace `/claim/<token>` lo
  amarra a una cuenta real cuando la persona entra.
- **Sorteo con derangement.** `public.perform_draw()` acomoda los puestos en un
  único ciclo hamiltoniano al azar, así que nadie se saca a sí mismo, cada uno
  es sorteado exactamente una vez, y no quedan parejitas sueltas.
- **Nadie ve los emparejamientos.** `members.assigned_to` no tiene permiso de
  lectura para ningún rol de cliente — ni para el admin. La única puerta es
  `public.get_my_assignment()`, que solo devuelve tu propio resultado.

## Puesta en marcha

1. **Crea el proyecto en Supabase** y corre `supabase/schema.sql` completo en el
   SQL editor. Es idempotente: se puede volver a correr sin romper nada.

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
src/app/                     /, /login, /dashboard, /g/[id], /claim/[token]
```

## Modelo de seguridad

RLS es la autoridad; los chequeos en TypeScript solo dan forma a la UI.

| Tabla       | Lectura                                        | Escritura                                          |
| ----------- | ---------------------------------------------- | -------------------------------------------------- |
| `profiles`  | solo el propio                                 | solo el propio                                     |
| `groups`    | admin o participante                           | solo admin (y solo `name` y presupuestos)          |
| `members`   | cualquiera del grupo, **sin** `assigned_to` ni `claim_token` | admin agrega/quita antes del sorteo   |
| `wishlists` | la propia y la de quien te salió — nada más    | solo la propia                                     |

Dos detalles que valen la pena:

- **RLS es por fila; el secreto acá es por columna.** Por eso el schema revoca
  `select` a nivel de tabla en `members` y lo vuelve a otorgar columna por
  columna, sin `assigned_to` ni `claim_token`. Un `select *` desde el cliente
  lo rechaza Postgres, no la app.
- **Las funciones helper son `security definer`** a propósito: sin eso, las
  políticas de `members` que consultan `members` se recursionan.

## Detalle pendiente de verificar

El SQL pasa por un parser de Postgres sin errores y la app compila, hace
typecheck y pasa lint. Lo que **no** se ha corrido es `schema.sql` contra una
base real, así que los cuerpos `plpgsql` (que ningún parser estático valida) y
el flujo completo contra Supabase quedan sin probar de punta a punta.
