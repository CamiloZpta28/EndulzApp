-- ============================================================================
-- Patch 002 — arreglar el EXECUTE de los helpers de RLS
--
-- El patch 001 revocó EXECUTE a PUBLIC en TODAS las funciones, incluidos los
-- helpers que las propias políticas de RLS invocan. Eso fue un error: las
-- expresiones de una política se evalúan con los privilegios del rol que
-- consulta, no del dueño de la tabla. Sin EXECUTE, cualquier SELECT sobre
-- `groups`, `members` o `wishlists` falla con:
--
--   42501  permission denied for function is_group_member
--
-- Síntoma en la app: el dashboard lista los parches (usa `my_groups()`, que es
-- security definer y no llama al helper) pero entrar a `/g/<id>` cae en el 404
-- de "Por acá no hay nada".
--
-- Estos cuatro helpers son predicados booleanos sobre el `auth.uid()` de quien
-- llama: no revelan nada que su propia fila no revele ya, y tienen que ser
-- ejecutables para que RLS funcione.
-- ============================================================================

grant execute on function public.is_group_member(uuid)   to authenticated;
grant execute on function public.is_group_admin(uuid)    to authenticated;
grant execute on function public.is_my_member(uuid)      to authenticated;
grant execute on function public.can_read_wishlist(uuid) to authenticated;

-- El trigger de auth: revocarle EXECUTE no aportaba nada — PostgREST no expone
-- funciones que retornan `trigger`, así que nunca fue alcanzable por la API — y
-- sí ponía en riesgo el registro de usuarios, que es el camino más crítico.
grant execute on function public.handle_new_user() to public;

-- ----------------------------------------------------------------------------
-- Verificación. Con el rol `anon` (la llave pública), esto debe dar:
--   rpc/my_groups          401  permission denied      <- sigue cerrado
--   rpc/get_claim_preview  200  []                     <- sigue abierto
--   rpc/is_group_member    401  permission denied      <- anon no, pero
--                                                         `authenticated` sí
-- Y en la app: entrar a un parche propio ya debe cargar.
-- ----------------------------------------------------------------------------
