-- ============================================================================
-- Patch 001 — cerrar EXECUTE a PUBLIC en todas las funciones
--
-- Para bases donde ya se corrió `schema.sql` antes de este arreglo.
-- (En un proyecto nuevo no hace falta: `schema.sql` ya trae la corrección.)
--
-- Postgres otorga EXECUTE a PUBLIC en cada función que se crea, y `anon` y
-- `authenticated` lo heredan de ahí. El `revoke ... from anon, authenticated`
-- original no tocaba ese grant implícito, así que `anon` podía llamar todas
-- las RPC. No había fuga de datos — cada función chequea `auth.uid()` — pero
-- la superficie expuesta no era la que se pretendía.
--
-- Verificar después de correrlo (debe dar 401, no 200):
--   curl -s -o /dev/null -w '%{http_code}\n' \
--     -X POST "$SUPABASE_URL/rest/v1/rpc/my_groups" \
--     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--     -H 'Content-Type: application/json' -d '{}'
-- ============================================================================

revoke execute on function public.handle_new_user()          from public;
revoke execute on function public.is_group_member(uuid)      from public;
revoke execute on function public.is_group_admin(uuid)       from public;
revoke execute on function public.is_my_member(uuid)         from public;
revoke execute on function public.can_read_wishlist(uuid)    from public;
revoke execute on function public.get_my_assignment(uuid)    from public;
revoke execute on function public.admin_group_members(uuid)  from public;
revoke execute on function public.get_claim_preview(uuid)    from public;
revoke execute on function public.claim_member(uuid)         from public;
revoke execute on function public.perform_draw(uuid)         from public;
revoke execute on function public.reset_draw(uuid)           from public;
revoke execute on function public.my_groups()                from public;
revoke execute on function public.create_group(text, numeric, numeric, text, text)
  from public;

-- Y volver a otorgar solo lo que cada rol necesita.
grant execute on function public.get_my_assignment(uuid)   to authenticated;
grant execute on function public.admin_group_members(uuid) to authenticated;
grant execute on function public.claim_member(uuid)        to authenticated;
grant execute on function public.perform_draw(uuid)        to authenticated;
grant execute on function public.reset_draw(uuid)          to authenticated;
grant execute on function public.my_groups()               to authenticated;
grant execute on function public.create_group(text, numeric, numeric, text, text)
  to authenticated;

-- La vista previa de la invitación es lo único que puede llamar un visitante
-- sin sesión.
grant execute on function public.get_claim_preview(uuid)   to anon, authenticated;
