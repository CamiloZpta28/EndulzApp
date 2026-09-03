-- ============================================================================
-- Patch 006 — la ruleta del sorteo
--
-- Corre después de 001–005. Idempotente.
--
-- CÓRRELO COMPLETO, no por pedazos: el editor SQL de Supabase envuelve todo
-- el script en UNA transacción, así que si algo falla a mitad se revierte
-- también lo que ya había pasado.
--
--   1. `members.revealed_at`: cuándo viste por primera vez a quién te salió.
--      Sirve para mostrar la ruleta una sola vez, y para que sea "una sola
--      vez de verdad" — en el celular y en el computador, no por navegador.
--   2. `get_my_assignment()` dice si ya lo viste.
-- ============================================================================

alter table public.members
  add column if not exists revealed_at timestamptz;

comment on column public.members.revealed_at is
  'Primera vez que esta persona vio su asignación. Null = todavía no gira la ruleta.';

-- ----------------------------------------------------------------------------
-- Marcar que ya giró la ruleta.
--
-- Es un RPC y no un UPDATE del cliente porque `revealed_at` no tiene grant de
-- columna: si fuera escribible desde el cliente, cualquiera podría "des-verlo"
-- y repetir la ruleta, o marcárselo a otra persona.
-- ----------------------------------------------------------------------------
create or replace function public.mark_assignment_revealed(p_group uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp as $fn$
begin
  update public.members m
     set revealed_at = now()
   where m.group_id = p_group
     and m.user_id = auth.uid()
     -- Solo la primera vez: si se vuelve a llamar no mueve la fecha.
     and m.revealed_at is null;
end;
$fn$;

revoke execute on function public.mark_assignment_revealed(uuid) from public;
grant execute on function public.mark_assignment_revealed(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- `get_my_assignment()` ahora dice si ya se reveló.
-- Gana una columna, así que cambia el tipo de retorno: DROP antes del CREATE.
-- ----------------------------------------------------------------------------
drop function if exists public.get_my_assignment(uuid);

create or replace function public.get_my_assignment(p_group uuid)
returns table (
  member_id       uuid,
  shadow_name     text,
  user_id         uuid,
  display_name    text,
  avatar_url      text,
  already_revealed boolean
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select t.id,
         -- El apodo del grupo manda sobre el nombre del perfil, igual que en
         -- el roster: si en este grupo se llama "el Mono", así debe salir.
         coalesce(nullif(trim(t.nickname), ''), t.shadow_name),
         t.user_id,
         nullif(trim(p.display_name), ''),
         p.avatar_url,
         (me.revealed_at is not null)
  from public.members me
  join public.members t on t.id = me.assigned_to
  left join public.profiles p on p.id = t.user_id
  where me.group_id = p_group and me.user_id = auth.uid();
$fn$;

revoke execute on function public.get_my_assignment(uuid) from public;
grant execute on function public.get_my_assignment(uuid) to authenticated;
