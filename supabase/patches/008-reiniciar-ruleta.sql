-- ============================================================================
-- Patch 008 — reiniciar el sorteo también reinicia la ruleta
--
-- Corre después de 001–007. Idempotente.
--
-- CÓRRELO COMPLETO, no por pedazos: el editor SQL de Supabase envuelve todo
-- el script en UNA transacción.
--
-- `reset_draw` borraba los emparejamientos pero dejaba `revealed_at` puesto,
-- así que al volver a sortear la gente veía el resultado nuevo sin ruleta.
-- La ruleta es "una vez por sorteo", no "una vez en la vida".
-- ============================================================================

create or replace function public.reset_draw(p_group uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp as $fn$
begin
  if not public.is_group_admin(p_group) then
    raise exception 'Solo el admin puede reiniciar el sorteo' using errcode = '42501';
  end if;

  update public.members
     set assigned_to = null,
         -- Sin esto la ruleta no volvía a salir en el sorteo siguiente.
         revealed_at = null
   where group_id = p_group;

  update public.groups
     set status = 'pending', drawn_at = null
   where id = p_group;
end;
$fn$;

revoke execute on function public.reset_draw(uuid) from public;
grant execute on function public.reset_draw(uuid) to authenticated;

-- Por si algún grupo quedó con la marca puesta y sin sorteo: se limpia.
update public.members m
   set revealed_at = null
 where m.revealed_at is not null
   and m.assigned_to is null;
