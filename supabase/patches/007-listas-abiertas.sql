-- ============================================================================
-- Patch 007 — las listas quedan abiertas dentro del grupo
--
-- Corre después de 001–006. Idempotente.
--
-- CÓRRELO COMPLETO, no por pedazos: el editor SQL de Supabase envuelve todo
-- el script en UNA transacción.
--
-- Qué cambia: antes solo podías leer tu lista y la de quien te salió. Ahora
-- cualquiera del grupo lee la de cualquiera del grupo.
--
-- Qué NO cambia — y es lo importante: el secreto del sorteo sigue intacto.
-- Lo que se guarda en secreto es `members.assigned_to` (quién le tiene a
-- quién), y eso vive en columnas sin permiso de lectura para ningún rol de
-- cliente. Ver la lista de alguien no dice quién se la va a cumplir, así que
-- abrir las listas no filtra emparejamientos.
-- ============================================================================

create or replace function public.can_read_wishlist(p_member uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $fn$
  select exists (
    select 1
    from public.members m
    where m.id = p_member
      and (
        public.is_group_member(m.group_id)
        or public.is_group_admin(m.group_id)
      )
  );
$fn$;

revoke execute on function public.can_read_wishlist(uuid) from public;
grant execute on function public.can_read_wishlist(uuid) to authenticated;

-- La política de `wishlists` no cambia: ya delega en esta función.
--   "wishlists: read own or target" -> using (public.can_read_wishlist(member_id))
-- Se le corrige el nombre para que no mienta sobre lo que hace.
drop policy if exists "wishlists: read own or target" on public.wishlists;
drop policy if exists "wishlists: read within group" on public.wishlists;
create policy "wishlists: read within group" on public.wishlists
  for select to authenticated
  using (public.can_read_wishlist(member_id));

-- Escribir sigue siendo solo lo propio.
drop policy if exists "wishlists: insert own" on public.wishlists;
create policy "wishlists: insert own" on public.wishlists
  for insert to authenticated
  with check (public.is_my_member(member_id));

drop policy if exists "wishlists: update own" on public.wishlists;
create policy "wishlists: update own" on public.wishlists
  for update to authenticated
  using (public.is_my_member(member_id)) with check (public.is_my_member(member_id));

drop policy if exists "wishlists: delete own" on public.wishlists;
create policy "wishlists: delete own" on public.wishlists
  for delete to authenticated
  using (public.is_my_member(member_id));
