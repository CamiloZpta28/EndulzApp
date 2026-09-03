-- ============================================================================
-- Patch 011 — el apodo también manda en "Me salió"
--
-- Corre después de 001–010. Idempotente.
--
-- CÓRRELO COMPLETO, no por pedazos: el editor SQL de Supabase envuelve todo
-- el script en UNA transacción.
--
-- El bug: la pestaña "Me salió" mostraba el nombre real aunque la persona
-- tuviera apodo en ese grupo.
--
-- La causa: el patch 006 metía `coalesce(apodo, shadow_name)` DENTRO de la
-- columna `shadow_name`, y el cliente lo combinaba con `display_name` dando
-- prioridad al perfil. Pero además el arreglo no podía hacerse en el cliente:
-- con esa forma es imposible saber si `shadow_name` trae un apodo o el
-- nombre de respaldo, así que no se puede implementar la prioridad correcta
-- (apodo > perfil > nombre de entrada).
--
-- La solución: que la función devuelva el nombre YA RESUELTO, como hace
-- `group_roster`. Un solo lugar decide, y no queda ambigüedad que el cliente
-- tenga que adivinar.
-- ============================================================================

drop function if exists public.get_my_assignment(uuid);

create or replace function public.get_my_assignment(p_group uuid)
returns table (
  member_id        uuid,
  /** Ya resuelto: apodo del grupo > nombre del perfil > nombre de entrada. */
  name             text,
  /** El apodo crudo, por si la UI quiere distinguirlo. `null` = no tiene. */
  nickname         text,
  user_id          uuid,
  avatar_url       text,
  already_revealed boolean
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select t.id,
         coalesce(
           nullif(trim(t.nickname), ''),
           nullif(trim(p.display_name), ''),
           t.shadow_name
         ),
         nullif(trim(t.nickname), ''),
         t.user_id,
         p.avatar_url,
         (me.revealed_at is not null)
  from public.members me
  join public.members t on t.id = me.assigned_to
  left join public.profiles p on p.id = t.user_id
  where me.group_id = p_group and me.user_id = auth.uid();
$fn$;

revoke execute on function public.get_my_assignment(uuid) from public;
grant execute on function public.get_my_assignment(uuid) to authenticated;
