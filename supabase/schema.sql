-- ============================================================================
-- EndulzApp — Amigo Secreto / Secret Santa
-- Supabase schema + RLS. Run top-to-bottom in the SQL editor.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.group_status as enum ('pending', 'drawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wishlist_type as enum ('endulzada', 'regalo');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

-- 1.1 profiles — 1:1 with auth.users
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- 1.2 groups
create table if not exists public.groups (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(trim(name)) between 1 and 80),
  admin_id          uuid not null references public.profiles (id) on delete cascade,
  status            public.group_status not null default 'pending',
  budget_endulzada  numeric(12, 2) not null default 0 check (budget_endulzada >= 0),
  budget_regalo     numeric(12, 2) not null default 0 check (budget_regalo >= 0),
  currency          text not null default 'COP',
  drawn_at          timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists groups_admin_id_idx on public.groups (admin_id);

-- 1.3 members — participants. user_id IS NULL => "shadow profile"
create table if not exists public.members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  user_id      uuid references public.profiles (id) on delete set null,
  shadow_name  text not null check (char_length(trim(shadow_name)) between 1 and 60),
  claim_token  uuid not null unique default gen_random_uuid(),
  assigned_to  uuid references public.members (id) on delete set null,
  created_at   timestamptz not null default now(),
  -- a member can never be their own secret santa
  constraint members_no_self_assign check (assigned_to is null or assigned_to <> id)
);
create index if not exists members_group_id_idx on public.members (group_id);
create index if not exists members_user_id_idx on public.members (user_id);
-- one real account can only occupy one seat per group
create unique index if not exists members_group_user_uniq
  on public.members (group_id, user_id) where user_id is not null;
-- a target can only be drawn once (a derangement is a bijection)
create unique index if not exists members_assigned_to_uniq
  on public.members (assigned_to) where assigned_to is not null;

-- 1.4 wishlists
create table if not exists public.wishlists (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members (id) on delete cascade,
  type       public.wishlist_type not null,
  item_name  text not null check (char_length(trim(item_name)) between 1 and 140),
  url        text,
  image_url  text,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists wishlists_member_type_idx on public.wishlists (member_id, type);

-- ----------------------------------------------------------------------------
-- 2. Auth trigger — mirror auth.users into profiles
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'parcero'), '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. Security-definer helpers (they break RLS recursion on public.members)
--    These run as the table owner, so they intentionally bypass RLS.
-- ----------------------------------------------------------------------------

-- Am I a participant of this group?
create or replace function public.is_group_member(p_group uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from public.members m
    where m.group_id = p_group and m.user_id = auth.uid()
  );
$fn$;

-- Am I the admin of this group?
create or replace function public.is_group_admin(p_group uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from public.groups g
    where g.id = p_group and g.admin_id = auth.uid()
  );
$fn$;

-- Is this member row my own seat?
create or replace function public.is_my_member(p_member uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from public.members m
    where m.id = p_member and m.user_id = auth.uid()
  );
$fn$;

-- My own seat OR the seat I drew. This is the wishlist read gate.
create or replace function public.can_read_wishlist(p_member uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from public.members m
    where m.id = p_member and m.user_id = auth.uid()
  ) or exists (
    select 1 from public.members me
    where me.user_id = auth.uid() and me.assigned_to = p_member
  );
$fn$;

-- ----------------------------------------------------------------------------
-- 4. Enable RLS + policies
-- ----------------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.groups    enable row level security;
alter table public.members   enable row level security;
alter table public.wishlists enable row level security;

-- 4.1 profiles ---------------------------------------------------------------
drop policy if exists "profiles: read self" on public.profiles;
create policy "profiles: read self" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles: insert self" on public.profiles;
create policy "profiles: insert self" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles: update self" on public.profiles;
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 4.2 groups -----------------------------------------------------------------
drop policy if exists "groups: read own groups" on public.groups;
create policy "groups: read own groups" on public.groups
  for select to authenticated
  using (admin_id = auth.uid() or public.is_group_member(id));

drop policy if exists "groups: create as admin" on public.groups;
create policy "groups: create as admin" on public.groups
  for insert to authenticated
  with check (admin_id = auth.uid());

drop policy if exists "groups: admin updates" on public.groups;
create policy "groups: admin updates" on public.groups
  for update to authenticated
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());

drop policy if exists "groups: admin deletes" on public.groups;
create policy "groups: admin deletes" on public.groups
  for delete to authenticated
  using (admin_id = auth.uid());

-- 4.3 members ----------------------------------------------------------------
-- Anyone in the group reads the roster (names only — see §5: `assigned_to`
-- and `claim_token` are not selectable by any client role, admin included).
drop policy if exists "members: read roster of my groups" on public.members;
create policy "members: read roster of my groups" on public.members
  for select to authenticated
  using (public.is_group_member(group_id) or public.is_group_admin(group_id));

-- Only the admin adds seats, and only before the draw.
drop policy if exists "members: admin adds" on public.members;
create policy "members: admin adds" on public.members
  for insert to authenticated
  with check (
    public.is_group_admin(group_id)
    and exists (select 1 from public.groups g where g.id = group_id and g.status = 'pending')
  );

-- The admin can rename any seat; an occupant can rename their own.
drop policy if exists "members: rename" on public.members;
create policy "members: rename" on public.members
  for update to authenticated
  using (public.is_group_admin(group_id) or user_id = auth.uid())
  with check (public.is_group_admin(group_id) or user_id = auth.uid());

-- The admin can remove a seat before the draw.
drop policy if exists "members: admin removes" on public.members;
create policy "members: admin removes" on public.members
  for delete to authenticated
  using (
    public.is_group_admin(group_id)
    and exists (select 1 from public.groups g where g.id = group_id and g.status = 'pending')
  );

-- 4.4 wishlists --------------------------------------------------------------
-- Read: my own list, plus the list of the person I drew. Nothing else.
drop policy if exists "wishlists: read own or target" on public.wishlists;
create policy "wishlists: read own or target" on public.wishlists
  for select to authenticated
  using (public.can_read_wishlist(member_id));

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

-- ----------------------------------------------------------------------------
-- 5. Column-level grants — RLS is row-level; this secret is column-level.
--    `members.assigned_to` (who got who) and `members.claim_token` (the
--    invite secret) must be unreachable through PostgREST for EVERY client
--    role, the group admin included. They are only ever exposed by the
--    security-definer RPCs in §6.
--    NOTE: a column REVOKE cannot cut into a table-level GRANT, so the table
--    privilege is revoked first and re-granted column by column.
-- ----------------------------------------------------------------------------
revoke select, insert, update on public.members from anon, authenticated;
grant select (id, group_id, user_id, shadow_name, created_at)
  on public.members to authenticated;
grant insert (group_id, shadow_name) on public.members to authenticated;
grant update (shadow_name)           on public.members to authenticated;
grant delete on public.members to authenticated;

-- `status`, `admin_id` and `drawn_at` are server-owned on groups too.
revoke insert, update on public.groups from anon, authenticated;
grant insert (name, admin_id, budget_endulzada, budget_regalo, currency)
  on public.groups to authenticated;
grant update (name, budget_endulzada, budget_regalo, currency)
  on public.groups to authenticated;

-- ----------------------------------------------------------------------------
-- 6. RPCs — the only doors to the secret columns
-- ----------------------------------------------------------------------------

-- 6.1 Who did I get? At most one row, only ever for the caller.
create or replace function public.get_my_assignment(p_group uuid)
returns table (
  member_id    uuid,
  shadow_name  text,
  user_id      uuid,
  display_name text,
  avatar_url   text
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select t.id, t.shadow_name, t.user_id, p.display_name, p.avatar_url
  from public.members me
  join public.members t on t.id = me.assigned_to
  left join public.profiles p on p.id = t.user_id
  where me.group_id = p_group and me.user_id = auth.uid();
$fn$;

-- 6.2 Admin roster, including invite tokens. Admin only. Still no assignments.
create or replace function public.admin_group_members(p_group uuid)
returns table (
  id           uuid,
  shadow_name  text,
  user_id      uuid,
  claim_token  uuid,
  claimed      boolean,
  created_at   timestamptz
)
language plpgsql stable security definer
set search_path = public, pg_temp as $fn$
begin
  if not public.is_group_admin(p_group) then
    raise exception 'Solo el admin del grupo puede ver los enlaces de invitación'
      using errcode = '42501';
  end if;

  return query
    select m.id, m.shadow_name, m.user_id, m.claim_token,
           (m.user_id is not null) as claimed, m.created_at
    from public.members m
    where m.group_id = p_group
    order by m.created_at;
end;
$fn$;

-- 6.3 Public preview of an invite link (callable before sign-in).
--     Leaks nothing but the group name and the seat label.
create or replace function public.get_claim_preview(p_token uuid)
returns table (
  group_id    uuid,
  group_name  text,
  shadow_name text,
  claimed     boolean,
  status      public.group_status
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select g.id, g.name, m.shadow_name, (m.user_id is not null), g.status
  from public.members m
  join public.groups g on g.id = m.group_id
  where m.claim_token = p_token;
$fn$;

-- 6.4 Claim a shadow seat with an invite token.
create or replace function public.claim_member(p_token uuid)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_member public.members;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para reclamar tu puesto'
      using errcode = '42501';
  end if;

  select * into v_member from public.members m
    where m.claim_token = p_token for update;

  if v_member.id is null then
    raise exception 'Enlace de invitación inválido' using errcode = 'P0002';
  end if;

  -- Already mine? Idempotent success, so a re-visited link is harmless.
  if v_member.user_id = v_uid then
    return v_member.id;
  end if;

  if v_member.user_id is not null then
    raise exception 'Ese puesto ya lo reclamó otra persona' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.members m
    where m.group_id = v_member.group_id and m.user_id = v_uid
  ) then
    raise exception 'Ya tienes un puesto en este grupo' using errcode = '23505';
  end if;

  update public.members set user_id = v_uid where id = v_member.id;

  return v_member.id;
end;
$fn$;

-- 6.4b Create a group and seat its admin, atomically.
--      `members.user_id` has no client-side column grant, so the admin's own
--      (pre-claimed) seat has to be created here rather than by the client.
create or replace function public.create_group(
  p_name             text,
  p_budget_endulzada numeric default 0,
  p_budget_regalo    numeric default 0,
  p_currency         text default 'COP',
  p_seat_name        text default null
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

  insert into public.groups (name, admin_id, budget_endulzada, budget_regalo, currency)
  values (
    trim(p_name), v_uid,
    greatest(coalesce(p_budget_endulzada, 0), 0),
    greatest(coalesce(p_budget_regalo, 0), 0),
    upper(coalesce(nullif(trim(p_currency), ''), 'COP'))
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

-- 6.5 THE DRAW — a random derangement, computed server-side.
--     Strategy: shuffle the seats into a single Hamiltonian cycle
--     (s[1] -> s[2] -> ... -> s[n] -> s[1]). That gives, with no retry loop:
--       * nobody draws themselves (A -> A impossible for n >= 2),
--       * every seat is drawn exactly once (a bijection, i.e. a derangement),
--       * one closed loop, so never disjoint pairs like A<->B plus C<->D.
create or replace function public.perform_draw(p_group uuid)
returns integer
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_group public.groups;
  v_count integer;
begin
  select * into v_group from public.groups g where g.id = p_group for update;

  if v_group.id is null then
    raise exception 'El grupo no existe' using errcode = 'P0002';
  end if;

  if v_group.admin_id <> auth.uid() then
    raise exception 'Solo el admin puede hacer el sorteo' using errcode = '42501';
  end if;

  if v_group.status = 'drawn' then
    raise exception 'Este grupo ya fue sorteado' using errcode = '55000';
  end if;

  select count(*) into v_count from public.members m where m.group_id = p_group;
  if v_count < 3 then
    raise exception 'Necesitas al menos 3 participantes para sortear (hay %)', v_count
      using errcode = '22023';
  end if;

  with shuffled as (
    select m.id,
           row_number() over (order by random()) as rn,
           count(*)     over ()                  as total
    from public.members m
    where m.group_id = p_group
  )
  update public.members m
     set assigned_to = nxt.id
    from shuffled cur
    join shuffled nxt on nxt.rn = (cur.rn % cur.total) + 1
   where m.id = cur.id;

  update public.groups
     set status = 'drawn', drawn_at = now()
   where id = p_group;

  return v_count;
end;
$fn$;

-- 6.6 Undo a draw (admin escape hatch, e.g. somebody dropped out).
create or replace function public.reset_draw(p_group uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp as $fn$
begin
  if not public.is_group_admin(p_group) then
    raise exception 'Solo el admin puede reiniciar el sorteo' using errcode = '42501';
  end if;

  update public.members set assigned_to = null where group_id = p_group;
  update public.groups set status = 'pending', drawn_at = null where id = p_group;
end;
$fn$;

-- 6.7 Dashboard listing: my groups plus head counts, in one round trip.
create or replace function public.my_groups()
returns table (
  id               uuid,
  name             text,
  status           public.group_status,
  admin_id         uuid,
  is_admin         boolean,
  budget_endulzada numeric,
  budget_regalo    numeric,
  currency         text,
  member_count     integer,
  created_at       timestamptz
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select g.id, g.name, g.status, g.admin_id,
         (g.admin_id = auth.uid()) as is_admin,
         g.budget_endulzada, g.budget_regalo, g.currency,
         (select count(*)::int from public.members m2 where m2.group_id = g.id),
         g.created_at
  from public.groups g
  where g.admin_id = auth.uid()
     or exists (
       select 1 from public.members m
       where m.group_id = g.id and m.user_id = auth.uid()
     )
  order by g.created_at desc;
$fn$;

-- ----------------------------------------------------------------------------
-- 7. Function grants — pin EXECUTE down explicitly.
--    Postgres grants EXECUTE to PUBLIC on every new function, and `anon` and
--    `authenticated` inherit it from there. Revoking from those two roles by
--    name leaves the PUBLIC grant untouched, so the revoke has to name PUBLIC.
-- ----------------------------------------------------------------------------
revoke execute on function public.get_my_assignment(uuid)  from public;
revoke execute on function public.admin_group_members(uuid) from public;
revoke execute on function public.get_claim_preview(uuid)   from public;
revoke execute on function public.claim_member(uuid)        from public;
revoke execute on function public.create_group(text, numeric, numeric, text, text)
  from public;
revoke execute on function public.perform_draw(uuid)        from public;
revoke execute on function public.reset_draw(uuid)          from public;
revoke execute on function public.my_groups()               from public;

grant execute on function public.get_my_assignment(uuid)   to authenticated;
grant execute on function public.admin_group_members(uuid) to authenticated;
grant execute on function public.claim_member(uuid)        to authenticated;
grant execute on function public.create_group(text, numeric, numeric, text, text)
  to authenticated;
grant execute on function public.perform_draw(uuid)        to authenticated;
grant execute on function public.reset_draw(uuid)          to authenticated;
grant execute on function public.my_groups()               to authenticated;
-- the invite preview is the only thing an anonymous visitor may call
grant execute on function public.get_claim_preview(uuid)   to anon, authenticated;

-- The RLS helpers MUST stay executable by `authenticated`. A policy's
-- expression is evaluated with the privileges of the querying role, not the
-- table owner's, so revoking these would make every SELECT on `groups`,
-- `members` and `wishlists` fail with `42501 permission denied for function`.
-- They are booleans about the caller's own `auth.uid()`, so exposing them
-- reveals nothing their own rows do not.
grant execute on function public.is_group_member(uuid)   to authenticated;
grant execute on function public.is_group_admin(uuid)    to authenticated;
grant execute on function public.is_my_member(uuid)      to authenticated;
grant execute on function public.can_read_wishlist(uuid) to authenticated;

-- `handle_new_user` keeps its default PUBLIC grant on purpose: PostgREST does
-- not expose functions returning `trigger`, so revoking buys nothing and only
-- risks breaking signup.

-- ----------------------------------------------------------------------------
-- 8. Storage — wishlist item images
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wishlist-images', 'wishlist-images', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Objects live at `<auth.uid()>/<file>`, so ownership is a path check.
drop policy if exists "wishlist images: public read" on storage.objects;
create policy "wishlist images: public read" on storage.objects
  for select using (bucket_id = 'wishlist-images');

drop policy if exists "wishlist images: upload own folder" on storage.objects;
create policy "wishlist images: upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "wishlist images: update own folder" on storage.objects;
create policy "wishlist images: update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "wishlist images: delete own folder" on storage.objects;
create policy "wishlist images: delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
