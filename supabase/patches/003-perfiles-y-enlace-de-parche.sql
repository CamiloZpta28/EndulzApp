-- ============================================================================
-- Patch 003 — perfil, enlace de parche y emoji
--
-- Corre esto DESPUÉS de 001 y 002. Es idempotente.
--
-- Trae:
--   1. `groups.emoji` y `groups.invite_code`  — identificar y compartir un parche
--   2. Campos de perfil: cumpleaños y celular  (+ bucket de fotos)
--   3. `profile_wishlists`  — la lista base, reutilizable entre parches
--   4. RPCs: unirse por enlace, ver el parche antes de entrar, importar la
--      lista base, rotar el enlace, y un roster con nombres y fotos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Emoji + enlace de invitación del parche
-- ----------------------------------------------------------------------------
alter table public.groups
  add column if not exists emoji text
    check (emoji is null or char_length(emoji) between 1 and 8);

alter table public.groups add column if not exists invite_code text;

-- Alfabeto sin caracteres que se confundan al dictar un enlace: sin I, O, 0, 1.
-- 32^8 ≈ 1.1e12 combinaciones, de sobra para que adivinar no sea viable.
create or replace function public.gen_invite_code()
returns text language sql volatile
set search_path = public, pg_temp as $fn$
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                  1 + floor(random() * 32)::int, 1),
           '')
  from generate_series(1, 8);
$fn$;

update public.groups
   set invite_code = public.gen_invite_code()
 where invite_code is null;

alter table public.groups alter column invite_code set default public.gen_invite_code();
alter table public.groups alter column invite_code set not null;

create unique index if not exists groups_invite_code_uniq
  on public.groups (invite_code);

-- El emoji sí lo edita el admin; el código NO — se rota con su propio RPC.
grant update (name, budget_endulzada, budget_regalo, currency, emoji)
  on public.groups to authenticated;
grant insert (name, admin_id, budget_endulzada, budget_regalo, currency, emoji)
  on public.groups to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Perfil: cumpleaños y celular
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists birthday date,
  add column if not exists phone text
    check (phone is null or char_length(phone) between 5 and 30);

-- `email` se refleja desde auth.users, así que el cliente no lo escribe: si
-- fuera editable, alguien podría mostrarle a su parche un correo que no es suyo.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, birthday, phone)
  on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- 3. La lista base del perfil
-- ----------------------------------------------------------------------------
create table if not exists public.profile_wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       public.wishlist_type not null,
  item_name  text not null check (char_length(trim(item_name)) between 1 and 140),
  url        text,
  image_url  text,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists profile_wishlists_user_type_idx
  on public.profile_wishlists (user_id, type);

alter table public.profile_wishlists enable row level security;

-- Privada por completo: es el borrador de cada uno, nadie más la ve.
drop policy if exists "profile_wishlists: own only" on public.profile_wishlists;
create policy "profile_wishlists: own only" on public.profile_wishlists
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. RPCs
-- ----------------------------------------------------------------------------

-- 4.1 Antes de iniciar sesión: lo mínimo para que el enlace sea acogedor.
--     A propósito NO devuelve nombres — quien tenga el código todavía no ha
--     demostrado ser del parche.
create or replace function public.get_join_preview(p_code text)
returns table (
  group_name   text,
  emoji        text,
  member_count integer,
  status       public.group_status
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select g.name, g.emoji,
         (select count(*)::int from public.members m where m.group_id = g.id),
         g.status
  from public.groups g
  where g.invite_code = upper(trim(p_code));
$fn$;

-- 4.2 Ya con sesión: la pantalla de "¿quieres unirte?" con los integrantes.
create or replace function public.get_join_details(p_code text)
returns table (
  group_id       uuid,
  group_name     text,
  emoji          text,
  status         public.group_status,
  already_member boolean,
  is_admin       boolean,
  members        jsonb
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select g.id, g.name, g.emoji, g.status,
         exists (
           select 1 from public.members m
           where m.group_id = g.id and m.user_id = auth.uid()
         ),
         (g.admin_id = auth.uid()),
         coalesce(
           (select jsonb_agg(
                     jsonb_build_object(
                       'name', coalesce(nullif(trim(p.display_name), ''), m.shadow_name),
                       'avatar_url', p.avatar_url
                     )
                     order by m.created_at
                   )
              from public.members m
              left join public.profiles p on p.id = m.user_id
             where m.group_id = g.id),
           '[]'::jsonb
         )
  from public.groups g
  where g.invite_code = upper(trim(p_code));
$fn$;

-- 4.3 Unirse. Cada quien crea su propio puesto con el nombre de su perfil.
create or replace function public.join_group(p_code text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_uid   uuid := auth.uid();
  v_group public.groups;
  v_name  text;
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para unirte' using errcode = '42501';
  end if;

  select * into v_group from public.groups g
    where g.invite_code = upper(trim(p_code)) for update;

  if v_group.id is null then
    raise exception 'Ese enlace de invitación no existe' using errcode = 'P0002';
  end if;

  -- Idempotente: volver a abrir el enlace no duplica el puesto.
  select m.id into v_id from public.members m
    where m.group_id = v_group.id and m.user_id = v_uid;
  if v_id is not null then
    return v_id;
  end if;

  -- Después del sorteo no se puede entrar: rompería el derangement, que ya
  -- es una biyección cerrada sobre los puestos existentes.
  if v_group.status = 'drawn' then
    raise exception 'Este parche ya fue sorteado, pídele al admin que lo reinicie'
      using errcode = '55000';
  end if;

  select coalesce(nullif(trim(p.display_name), ''), 'Parcero')
    into v_name
    from public.profiles p where p.id = v_uid;

  insert into public.members (group_id, user_id, shadow_name)
  values (v_group.id, v_uid, coalesce(v_name, 'Parcero'))
  returning id into v_id;

  return v_id;
end;
$fn$;

-- 4.4 Rotar el enlace, por si se filtró en el grupo equivocado.
create or replace function public.rotate_invite_code(p_group uuid)
returns text
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_code text;
begin
  if not public.is_group_admin(p_group) then
    raise exception 'Solo el admin puede cambiar el enlace' using errcode = '42501';
  end if;

  -- El índice único es la autoridad; reintenta ante una colisión improbable.
  for _ in 1 .. 10 loop
    begin
      v_code := public.gen_invite_code();
      update public.groups set invite_code = v_code where id = p_group;
      return v_code;
    exception when unique_violation then
      null;
    end;
  end loop;

  raise exception 'No pudimos generar un enlace nuevo, intenta otra vez';
end;
$fn$;

-- 4.5 Roster con nombre y foto. `members` por sí solo no alcanza: las fotos
--     viven en `profiles`, que solo deja leer la fila propia.
--     Devuelve nombre, foto y cumpleaños — el celular NO, que es más sensible
--     y nadie lo ha pedido para el parche.
create or replace function public.group_roster(p_group uuid)
returns table (
  member_id    uuid,
  user_id      uuid,
  name         text,
  avatar_url   text,
  birthday     date,
  is_me        boolean,
  is_admin     boolean,
  created_at   timestamptz
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select m.id, m.user_id,
         coalesce(nullif(trim(p.display_name), ''), m.shadow_name),
         p.avatar_url, p.birthday,
         (m.user_id = auth.uid()),
         (m.user_id = g.admin_id),
         m.created_at
  from public.members m
  join public.groups g on g.id = m.group_id
  left join public.profiles p on p.id = m.user_id
  where m.group_id = p_group
    and (public.is_group_member(p_group) or public.is_group_admin(p_group))
  order by m.created_at;
$fn$;

-- 4.6 Copiar la lista base al puesto de un parche.
--     Copia, no enlaza: así ajustar la lista de un parche no le cambia el
--     regalo a nadie más, y editar la base después no toca los parches vivos.
create or replace function public.import_profile_wishlist(
  p_member uuid,
  p_type   public.wishlist_type default null
)
returns integer
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_uid   uuid := auth.uid();
  v_count integer;
begin
  if not exists (
    select 1 from public.members m
    where m.id = p_member and m.user_id = v_uid
  ) then
    raise exception 'Ese puesto no es tuyo' using errcode = '42501';
  end if;

  with nuevos as (
    insert into public.wishlists (member_id, type, item_name, url, image_url, note)
    select p_member, pw.type, pw.item_name, pw.url, pw.image_url, pw.note
      from public.profile_wishlists pw
     where pw.user_id = v_uid
       and (p_type is null or pw.type = p_type)
       -- no repetir lo que ya está en el parche
       and not exists (
         select 1 from public.wishlists w
         where w.member_id = p_member
           and w.type = pw.type
           and lower(trim(w.item_name)) = lower(trim(pw.item_name))
       )
    returning 1
  )
  select count(*)::int into v_count from nuevos;

  return v_count;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- 5. Grants de las funciones nuevas
-- ----------------------------------------------------------------------------
revoke execute on function public.gen_invite_code()                from public;
revoke execute on function public.get_join_preview(text)           from public;
revoke execute on function public.get_join_details(text)           from public;
revoke execute on function public.join_group(text)                 from public;
revoke execute on function public.rotate_invite_code(uuid)         from public;
revoke execute on function public.group_roster(uuid)               from public;
revoke execute on function
  public.import_profile_wishlist(uuid, public.wishlist_type)        from public;

grant execute on function public.get_join_details(text)     to authenticated;
grant execute on function public.join_group(text)           to authenticated;
grant execute on function public.rotate_invite_code(uuid)   to authenticated;
grant execute on function public.group_roster(uuid)         to authenticated;
grant execute on function
  public.import_profile_wishlist(uuid, public.wishlist_type) to authenticated;

-- Lo único que ve un visitante sin sesión: que el parche existe y cuántos van.
grant execute on function public.get_join_preview(text)     to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. `create_group` ahora acepta emoji y devuelve el enlace
-- ----------------------------------------------------------------------------
create or replace function public.create_group(
  p_name             text,
  p_budget_endulzada numeric default 0,
  p_budget_regalo    numeric default 0,
  p_currency         text default 'COP',
  p_seat_name        text default null,
  p_emoji            text default null
)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_uid   uuid := auth.uid();
  v_group uuid;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para crear un grupo' using errcode = '42501';
  end if;

  insert into public.groups
    (name, admin_id, budget_endulzada, budget_regalo, currency, emoji)
  values (
    trim(p_name), v_uid,
    greatest(coalesce(p_budget_endulzada, 0), 0),
    greatest(coalesce(p_budget_regalo, 0), 0),
    upper(coalesce(nullif(trim(p_currency), ''), 'COP')),
    nullif(trim(coalesce(p_emoji, '')), '')
  )
  returning id into v_group;

  insert into public.members (group_id, user_id, shadow_name)
  values (
    v_group, v_uid,
    coalesce(
      nullif(trim(p_seat_name), ''),
      (select nullif(trim(p.display_name), '') from public.profiles p where p.id = v_uid),
      'Admin'
    )
  );

  return v_group;
end;
$fn$;

revoke execute on function
  public.create_group(text, numeric, numeric, text, text, text) from public;
grant execute on function
  public.create_group(text, numeric, numeric, text, text, text) to authenticated;

-- La firma vieja de 5 argumentos queda huérfana; se retira para que no haya
-- dos `create_group` y PostgREST no tenga que desambiguar.
drop function if exists public.create_group(text, numeric, numeric, text, text);

-- ----------------------------------------------------------------------------
-- 7. Storage — fotos de perfil
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars: upload own folder" on storage.objects;
create policy "avatars: upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: update own folder" on storage.objects;
create policy "avatars: update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: delete own folder" on storage.objects;
create policy "avatars: delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
