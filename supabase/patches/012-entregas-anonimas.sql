-- ============================================================================
-- Patch 012 — avisar que ya entregaste la endulzada, sin decir quién eres
--
-- Corre después de 001–011. Idempotente.
--
-- CÓRRELO COMPLETO, no por pedazos: el editor SQL de Supabase envuelve todo
-- el script en UNA transacción. Si algo falla, se revierte el archivo entero
-- y hay que volver a correrlo todo.
--
-- Qué trae:
--   1. `groups.delivery_mode`: cómo entrega cada grupo ('en_persona' con la
--      bolsa, o 'escondida' con mensaje y foto).
--   2. `set_group_endulzadas` deja de recrear las fechas que no cambiaron.
--   3. `deliveries`: una fila por endulzada y por persona que recibe.
--   4. Las funciones para entregar, poner foto, deshacer y responder.
--   5. Lo que lee la página: mis entregas y el avance del grupo.
--   6. Lo que usa el servidor para avisar por push (solo service_role).
--   7. `reset_draw` borra las entregas del sorteo que se deshace.
--   8. El bucket privado de fotos.
--
-- EL ANONIMATO ES ESTRUCTURAL: la tabla no tiene columna de remitente. La
-- entrega se guarda a nombre de quien RECIBE, y quien la dio está implícito
-- en el sorteo (el puesto cuyo `assigned_to` apunta a quien recibe). Como no
-- hay dato, no hay consulta, política ni error de programación que lo pueda
-- filtrar. Tampoco se guarda la hora, solo el día: en una oficina "llegó a las
-- 8:03" y "Juan entra a las 8:00" ya es una pista.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Modo de entrega del grupo
-- ----------------------------------------------------------------------------
alter table public.groups
  add column if not exists delivery_mode text not null default 'en_persona'
    check (delivery_mode in ('en_persona', 'escondida'));

-- Las column grants se suman: esto agrega una columna a las que el admin ya
-- podía editar (la política "groups: admin updates" sigue diciendo quién).
grant update (delivery_mode) on public.groups to authenticated;

-- ----------------------------------------------------------------------------
-- 2. El calendario se edita sin recrear lo que no cambió
--
--    Antes se borraban TODAS las fechas y se volvían a insertar, y la acción
--    de ajustes llama esto en cada guardado — aunque solo se cambie el
--    nombre. Con las entregas colgando de la endulzada (on delete cascade),
--    renombrar el grupo habría borrado todas las entregas. Ahora solo se
--    borran las fechas que ya no están, y las que siguen conservan su id.
-- ----------------------------------------------------------------------------
create or replace function public.set_group_endulzadas(
  p_group uuid,
  p_dates date[]
)
returns integer
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  -- Sin nulos: `x = any(array[null])` da null y no false, y el `not` de
  -- abajo dejaría vivas fechas que había que borrar.
  v_dates date[] := array_remove(coalesce(p_dates, '{}'::date[]), null);
  v_count integer;
begin
  if not public.is_group_admin(p_group) then
    raise exception 'Solo el admin puede definir las endulzadas'
      using errcode = '42501';
  end if;

  delete from public.group_endulzadas
   where group_id = p_group
     and not (happens_on = any (v_dates));

  insert into public.group_endulzadas (group_id, happens_on)
  select p_group, fecha from unnest(v_dates) as fecha
  on conflict (group_id, happens_on) do nothing;

  select count(*)::int into v_count
    from public.group_endulzadas where group_id = p_group;

  return v_count;
end;
$fn$;

revoke execute on function public.set_group_endulzadas(uuid, date[]) from public;
grant execute on function public.set_group_endulzadas(uuid, date[]) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Las entregas
-- ----------------------------------------------------------------------------
create table if not exists public.deliveries (
  id            uuid primary key default gen_random_uuid(),
  endulzada_id  uuid not null references public.group_endulzadas (id) on delete cascade,
  -- Quien RECIBE. No hay columna de quien da: ver el encabezado.
  recipient_id  uuid not null references public.members (id) on delete cascade,
  message       text check (message is null or char_length(message) <= 500),
  -- `<delivery_id>/<uuid>.<ext>` en el bucket privado. Nunca lleva el id de
  -- la persona, a diferencia de las fotos de las listas.
  photo_path    text,
  status        text not null default 'entregada'
                  check (status in ('entregada', 'encontrada', 'no_la_encuentro')),
  -- Solo el día. A propósito no hay `created_at`.
  delivered_on  date not null,
  unique (endulzada_id, recipient_id)
);

create index if not exists deliveries_recipient_idx
  on public.deliveries (recipient_id);

-- Nadie la toca directo: todo pasa por las funciones de abajo, que son las
-- que saben quién es quién. RLS prendido y sin políticas = cerrado, y además
-- se quitan los permisos que Supabase da por defecto en tablas nuevas.
alter table public.deliveries enable row level security;
revoke all on public.deliveries from anon, authenticated;

-- Hoy en Colombia. `current_date` sería UTC, y a las 8 p.m. de Bogotá ya es
-- mañana en UTC: una entrega de la noche quedaría con la fecha corrida.
create or replace function public.delivery_today()
returns date language sql stable
set search_path = public, pg_temp as $fn$
  select (now() at time zone 'America/Bogota')::date;
$fn$;

-- ----------------------------------------------------------------------------
-- 4. Lo que hace cada quien
-- ----------------------------------------------------------------------------

-- Quien da: "ya la dejé" (o "ya la tengo lista" en modo en persona). Si ya
-- existía, la edita. `notice` le dice al servidor qué push mandar: 'llego' la
-- primera vez, 'pista' si la cambió de escondite tras un "no la encuentro", y
-- null si fue solo una corrección que no amerita molestar a nadie.
create or replace function public.deliver_endulzada(
  p_group     uuid,
  p_endulzada uuid,
  p_message   text default null
)
returns table (delivery_id uuid, notice text)
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_target  uuid;
  v_mode    text;
  v_id      uuid;
  v_status  text;
  v_message text := nullif(trim(coalesce(p_message, '')), '');
begin
  select m.assigned_to into v_target
    from public.members m
   where m.group_id = p_group and m.user_id = auth.uid();

  if v_target is null then
    raise exception 'Todavía no tienes a quién entregarle' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.group_endulzadas e
     where e.id = p_endulzada and e.group_id = p_group
  ) then
    raise exception 'Esa endulzada no es de este grupo' using errcode = '22023';
  end if;

  select g.delivery_mode into v_mode from public.groups g where g.id = p_group;
  -- En persona no hay mensaje: lo que importa es que esté lista.
  if v_mode = 'en_persona' then
    v_message := null;
  end if;

  if v_message is not null and char_length(v_message) > 500 then
    raise exception 'El mensaje es muy largo (máximo 500 letras)' using errcode = '22001';
  end if;

  select d.id, d.status into v_id, v_status
    from public.deliveries d
   where d.endulzada_id = p_endulzada and d.recipient_id = v_target
   for update;

  if v_id is null then
    insert into public.deliveries (endulzada_id, recipient_id, message, delivered_on)
    values (p_endulzada, v_target, v_message, public.delivery_today())
    returning id into v_id;

    return query select v_id, 'llego'::text;
    return;
  end if;

  if v_status = 'encontrada' then
    raise exception 'Ya la encontró: esa entrega quedó cerrada' using errcode = '55000';
  end if;

  -- Si la cambió de escondite después de un "no la encuentro", esa respuesta
  -- ya no aplica: vuelve a quedar pendiente de que la encuentre.
  update public.deliveries
     set message = v_message, status = 'entregada'
   where id = v_id;

  return query select v_id,
    case when v_status = 'no_la_encuentro' then 'pista' end::text;
end;
$fn$;

-- Quien da: pone, cambia o quita la foto. Devuelve la ruta vieja para que el
-- servidor borre el archivo. La ruta tiene que ser de ESTA entrega: si no, un
-- usuario podría apuntar la suya a la foto de otra entrega y el servidor, que
-- sirve lo que diga la base, se la entregaría.
create or replace function public.set_delivery_photo(
  p_delivery uuid,
  p_path     text
)
returns text
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_old  text;
  v_mode text;
begin
  select d.photo_path, g.delivery_mode into v_old, v_mode
    from public.deliveries d
    join public.group_endulzadas e on e.id = d.endulzada_id
    join public.groups g on g.id = e.group_id
    join public.members me
      on me.assigned_to = d.recipient_id and me.user_id = auth.uid()
   where d.id = p_delivery and d.status <> 'encontrada'
   for update of d;

  if not found then
    raise exception 'No puedes cambiar esa entrega' using errcode = '42501';
  end if;

  if p_path is not null then
    if v_mode <> 'escondida' then
      raise exception 'En este grupo las entregas no llevan foto' using errcode = '22023';
    end if;
    if p_path !~ ('^' || p_delivery::text || '/[0-9a-f-]{36}\.(webp|jpg)$') then
      raise exception 'Ruta de foto inválida' using errcode = '22023';
    end if;
  end if;

  update public.deliveries set photo_path = p_path where id = p_delivery;
  return v_old;
end;
$fn$;

-- Quien da: se arrepiente. Mientras no la hayan encontrado. Devuelve la foto
-- para que el servidor la borre.
create or replace function public.undo_delivery(p_delivery uuid)
returns text
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_path text;
begin
  delete from public.deliveries d
   using public.members me
   where d.id = p_delivery
     and me.assigned_to = d.recipient_id
     and me.user_id = auth.uid()
     and d.status <> 'encontrada'
  returning d.photo_path into v_path;

  if not found then
    raise exception 'No puedes deshacer esa entrega' using errcode = '42501';
  end if;

  return v_path;
end;
$fn$;

-- Quien recibe: "¡La encontré!" o "No la encuentro". Solo esos dos: nada de
-- texto libre, que convertiría esto en un chat.
create or replace function public.respond_delivery(
  p_delivery uuid,
  p_status   text
)
returns void
language plpgsql security definer
set search_path = public, pg_temp as $fn$
begin
  if p_status not in ('encontrada', 'no_la_encuentro') then
    raise exception 'Respuesta inválida' using errcode = '22023';
  end if;

  update public.deliveries d
     set status = p_status
    from public.members me
   where d.id = p_delivery
     and me.id = d.recipient_id
     and me.user_id = auth.uid();

  if not found then
    raise exception 'Esa entrega no es tuya' using errcode = '42501';
  end if;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- 5. Lo que lee la página
-- ----------------------------------------------------------------------------

-- Mis entregas en este grupo, en las dos direcciones. Las 'recibida' nunca
-- dicen de quién, y solo salen en modo escondida: en persona no hay nada que
-- avisarle a quien recibe.
create or replace function public.my_group_deliveries(p_group uuid)
returns table (
  delivery_id  uuid,
  endulzada_id uuid,
  happens_on   date,
  direction    text,
  message      text,
  photo_path   text,
  status       text,
  delivered_on date
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select d.id, e.id, e.happens_on, 'recibida', d.message, d.photo_path,
         d.status, d.delivered_on
    from public.deliveries d
    join public.group_endulzadas e on e.id = d.endulzada_id
    join public.groups g on g.id = e.group_id
    join public.members me on me.id = d.recipient_id
   where e.group_id = p_group
     and me.user_id = auth.uid()
     and g.delivery_mode = 'escondida'
  union all
  select d.id, e.id, e.happens_on, 'dada', d.message, d.photo_path,
         d.status, d.delivered_on
    from public.deliveries d
    join public.group_endulzadas e on e.id = d.endulzada_id
    join public.members me on me.assigned_to = d.recipient_id
   where e.group_id = p_group
     and me.user_id = auth.uid();
$fn$;

-- El avance de cada endulzada: cuántas listas de cuántas. Solo números: quién
-- le dio a quién no sale de ahí.
create or replace function public.delivery_progress(p_group uuid)
returns table (
  endulzada_id uuid,
  happens_on   date,
  delivered    integer,
  total        integer
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select e.id, e.happens_on,
         (select count(*) from public.deliveries d where d.endulzada_id = e.id)::int,
         (select count(*) from public.members m
           where m.group_id = p_group and m.assigned_to is not null)::int
    from public.group_endulzadas e
   where e.group_id = p_group
     and (public.is_group_member(p_group) or public.is_group_admin(p_group))
   order by e.happens_on;
$fn$;

-- ----------------------------------------------------------------------------
-- 6. Para el servidor: a qué dispositivos avisar
--
--    `p_to` = 'recipient' (llegó tu endulzada) o 'giver' (la encontró). Solo
--    service_role: devolver endpoints y llaves push de otra persona a un
--    usuario cualquiera le permitiría mandarle notificaciones a nombre de la
--    app. El servidor la llama DESPUÉS de que la función con la sesión del
--    usuario confirmó que esa entrega es suya.
-- ----------------------------------------------------------------------------
create or replace function public.delivery_push_targets(
  p_delivery uuid,
  p_to       text
)
returns table (
  group_id   uuid,
  group_name text,
  emoji      text,
  endpoint   text,
  p256dh     text,
  auth       text
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select g.id, g.name, g.emoji, s.endpoint, s.p256dh, s.auth
    from public.deliveries d
    join public.group_endulzadas e on e.id = d.endulzada_id
    join public.groups g on g.id = e.group_id
    join public.members who
      on (p_to = 'recipient' and who.id = d.recipient_id)
      or (p_to = 'giver' and who.assigned_to = d.recipient_id)
    join public.push_subscriptions s on s.user_id = who.user_id
   where d.id = p_delivery
     -- En persona no se le avisa nada a quien recibe: lo descubre en la
     -- reunión. Lo decide la base y no el formulario.
     and (p_to = 'giver' or g.delivery_mode = 'escondida');
$fn$;

-- Para la limpieza del cron: cuáles de estas entregas siguen existiendo. Las
-- fotos de entregas borradas en cascada (se quitó la fecha, se borró el grupo,
-- se reinició el sorteo) quedan huérfanas en Storage, porque SQL no puede
-- borrar archivos; el cron las barre.
create or replace function public.existing_delivery_ids(p_ids uuid[])
returns setof uuid
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select d.id from public.deliveries d where d.id = any (p_ids);
$fn$;

-- ----------------------------------------------------------------------------
-- Permisos. EXECUTE va a PUBLIC por defecto (la lección del patch 001), así
-- que primero se quita y después se da a quien corresponde.
-- ----------------------------------------------------------------------------
revoke execute on function public.delivery_today() from public;
revoke execute on function public.deliver_endulzada(uuid, uuid, text) from public;
revoke execute on function public.set_delivery_photo(uuid, text) from public;
revoke execute on function public.undo_delivery(uuid) from public;
revoke execute on function public.respond_delivery(uuid, text) from public;
revoke execute on function public.my_group_deliveries(uuid) from public;
revoke execute on function public.delivery_progress(uuid) from public;
revoke execute on function public.delivery_push_targets(uuid, text) from public;
revoke execute on function public.existing_delivery_ids(uuid[]) from public;

-- `delivery_today` la usa `deliver_endulzada`, que corre como dueño: no
-- necesita grant para nadie más.
grant execute on function public.deliver_endulzada(uuid, uuid, text) to authenticated;
grant execute on function public.set_delivery_photo(uuid, text) to authenticated;
grant execute on function public.undo_delivery(uuid) to authenticated;
grant execute on function public.respond_delivery(uuid, text) to authenticated;
grant execute on function public.my_group_deliveries(uuid) to authenticated;
grant execute on function public.delivery_progress(uuid) to authenticated;

grant execute on function public.delivery_push_targets(uuid, text) to service_role;
grant execute on function public.existing_delivery_ids(uuid[]) to service_role;

-- ----------------------------------------------------------------------------
-- 7. Reiniciar el sorteo borra las entregas
--
--    Quien dio está implícito en el sorteo. Si se vuelve a sortear, una
--    entrega vieja quedaría atribuida a quien le toque ahora a esa persona:
--    vería "ya la entregaste" sin haber hecho nada.
-- ----------------------------------------------------------------------------
create or replace function public.reset_draw(p_group uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp as $fn$
begin
  if not public.is_group_admin(p_group) then
    raise exception 'Solo el admin puede reiniciar el sorteo' using errcode = '42501';
  end if;

  delete from public.deliveries d
   using public.group_endulzadas e
   where e.id = d.endulzada_id and e.group_id = p_group;

  update public.members
     set assigned_to = null,
         revealed_at = null
   where group_id = p_group;

  update public.groups
     set status = 'pending', drawn_at = null
   where id = p_group;
end;
$fn$;

revoke execute on function public.reset_draw(uuid) from public;
grant execute on function public.reset_draw(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. El bucket de fotos de entregas
--
--    PRIVADO y SIN políticas: ningún usuario lo toca directo, ni para leer.
--    Sube y lee solo el servidor con la llave de servicio, después de que la
--    base confirmó que la entrega es de quien pide. Así el archivo no queda
--    con el `owner` de quien lo subió, y la dirección que ve el navegador es
--    una ruta de la app, no una de Storage.
--
--    Solo WEBP y JPEG: son lo que sale de la compresión del navegador, que
--    re-dibuja la foto y con eso le borra los metadatos (GPS, "iPhone de
--    Fulano"). Un GIF pasaría sin re-dibujar.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-photos', 'delivery-photos', false, 3145728,
  array['image/webp', 'image/jpeg']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 3145728,
      allowed_mime_types = array['image/webp', 'image/jpeg'];
