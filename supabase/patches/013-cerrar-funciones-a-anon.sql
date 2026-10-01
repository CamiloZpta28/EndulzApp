-- ============================================================================
-- Patch 013 — cerrarle las funciones a quien no tiene sesión
--
-- Corre después de 001–012. Idempotente.
--
-- CÓRRELO COMPLETO, no por pedazos: el editor SQL de Supabase envuelve todo
-- el script en UNA transacción.
--
-- EL HUECO. Los parches anteriores cerraban cada función nueva con
-- `revoke execute ... from public`, creyendo que el permiso por defecto era
-- de PUBLIC. En Supabase no es así: tiene "default privileges" que le dan
-- EXECUTE a `anon` y a `authenticated` DIRECTAMENTE en cada función que se
-- CREA (no en las que se reemplazan). Quitarle el permiso a PUBLIC no toca
-- esos dos.
--
-- Comprobado con la llave anon, que es pública (va en el JavaScript de la
-- página): se podían llamar `pending_reminders`, `mark_reminder_sent` y
-- `drop_push_subscription`, que eran solo para el cron. La primera devuelve,
-- para cualquier fecha que se le pase, los grupos con su nombre y los
-- dispositivos de notificación de sus miembros; las otras dos permitían
-- borrarle a alguien las notificaciones o silenciar sus recordatorios.
-- Mandar notificaciones falsas NO era posible: eso exige la llave privada
-- VAPID, que solo tiene el servidor.
--
-- EL ARREGLO, en tres partes:
--   1. Que lo que se cree de acá en adelante nazca cerrado.
--   2. Quitarle EXECUTE a `anon` en todas las funciones existentes, menos la
--      única que la necesita: la vista previa de una invitación.
--   3. Las funciones del servidor quedan solo para `service_role`.
--
-- No cambia nada para quien tiene sesión: todo lo que `authenticated` puede
-- correr hoy lo sigue pudiendo correr, salvo las del punto 3.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. De acá en adelante, las funciones nuevas nacen cerradas
--
--    Aplica a las que cree el rol que corre este script (el del editor SQL,
--    que es el que crea todo en este proyecto). Cada parche ya da sus grants
--    a `authenticated` explícitamente, así que esto no rompe ninguno.
-- ----------------------------------------------------------------------------
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Las funciones que ya existen
--
--    Antes de quitarle el permiso a PUBLIC se le da explícito a
--    `authenticated` a toda función que hoy pueda correr: si alguna lo tenía
--    solo a través de PUBLIC, quitárselo la dejaría sin acceso y rompería la
--    app (la lección del patch 002).
--
--    Se saltan las funciones de trigger (`handle_new_user`): PostgREST no las
--    expone, y tocarlas solo arriesga el registro de usuarios.
-- ----------------------------------------------------------------------------
do $do$
declare
  f record;
begin
  for f in
    select p.oid, p.oid::regprocedure as firma
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.prorettype <> 'trigger'::regtype
  loop
    if has_function_privilege('authenticated', f.oid, 'execute') then
      execute format('grant execute on function %s to authenticated', f.firma);
    end if;
    execute format('revoke execute on function %s from public, anon', f.firma);
  end loop;
end;
$do$;

-- La única que necesita alguien sin sesión: la pantalla de "¿Quieres unirte?"
-- cuando abren el enlace sin haber entrado. No devuelve nombres.
grant execute on function public.get_join_preview(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Las del servidor: solo `service_role`
-- ----------------------------------------------------------------------------
revoke execute on function public.pending_reminders(date) from authenticated;
revoke execute on function
  public.mark_reminder_sent(uuid, uuid, text, date, integer) from authenticated;
revoke execute on function public.drop_push_subscription(text) from authenticated;
revoke execute on function public.delivery_push_targets(uuid, text) from authenticated;
revoke execute on function public.existing_delivery_ids(uuid[]) from authenticated;

grant execute on function public.pending_reminders(date) to service_role;
grant execute on function
  public.mark_reminder_sent(uuid, uuid, text, date, integer) to service_role;
grant execute on function public.drop_push_subscription(text) to service_role;
grant execute on function public.delivery_push_targets(uuid, text) to service_role;
grant execute on function public.existing_delivery_ids(uuid[]) to service_role;
