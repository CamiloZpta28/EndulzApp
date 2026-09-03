-- ============================================================================
-- Patch 005 — calendario de endulzadas y apodos por parche
--
-- Corre después de 001–004. Idempotente.
--
-- CÓRRELO COMPLETO, no por pedazos: el editor SQL de Supabase envuelve todo
-- el script en UNA transacción, así que si algo falla a mitad se revierte
-- también lo que ya había pasado.
--
--   1. `group_endulzadas`: una fila por endulzada, con su fecha. Reemplaza a
--      `groups.endulzada_at`, que solo aguantaba una.
--   2. `members.nickname`: cómo te llamas en ESE parche.
--   3. Las funciones que muestran nombres prefieren el apodo.
--   4. `sort_order` en las listas: el orden lo pone cada persona, arriba lo
--      que más quiere.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. El calendario de endulzadas
--
--    Tabla y no columnas porque la cantidad la decide cada parche: tres
--    endulzadas en uno, ocho en otro. `unique (group_id, happens_on)` evita
--    dos endulzadas el mismo día, que sería un error de dedo, no un caso real.
-- ----------------------------------------------------------------------------
create table if not exists public.group_endulzadas (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  happens_on date not null,
  created_at timestamptz not null default now(),
  unique (group_id, happens_on)
);

create index if not exists group_endulzadas_group_idx
  on public.group_endulzadas (group_id, happens_on);

alter table public.group_endulzadas enable row level security;

drop policy if exists "endulzadas: read my groups" on public.group_endulzadas;
create policy "endulzadas: read my groups" on public.group_endulzadas
  for select to authenticated
  using (
    public.is_group_member(group_id) or public.is_group_admin(group_id)
  );

drop policy if exists "endulzadas: admin writes" on public.group_endulzadas;
create policy "endulzadas: admin writes" on public.group_endulzadas
  for all to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

grant select, insert, update, delete on public.group_endulzadas to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Apodo por parche
--
--    `shadow_name` es la foto del nombre al momento de entrar; `nickname` es
--    una elección explícita. Se necesitan las dos columnas para poder
--    distinguir "no escogí apodo, muéstrame como en mi perfil" de "en este
--    parche quiero llamarme así".
-- ----------------------------------------------------------------------------
alter table public.members
  add column if not exists nickname text
    check (nickname is null or char_length(trim(nickname)) between 1 and 40);

-- Cada quien edita el suyo; la política "members: rename" ya permite
-- `user_id = auth.uid()` además del admin.
grant update (shadow_name, nickname) on public.members to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Reemplazar el calendario de un parche de una sola vez
--
--    Un RPC y no borrar+insertar desde el cliente: así es atómico y no queda
--    un parche con el calendario a medias si algo se cae en el medio.
-- ----------------------------------------------------------------------------
create or replace function public.set_group_endulzadas(
  p_group uuid,
  p_dates date[]
)
returns integer
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_count integer;
begin
  if not public.is_group_admin(p_group) then
    raise exception 'Solo el admin puede definir las endulzadas'
      using errcode = '42501';
  end if;

  delete from public.group_endulzadas where group_id = p_group;

  insert into public.group_endulzadas (group_id, happens_on)
  select p_group, fecha
    from unnest(coalesce(p_dates, '{}'::date[])) as fecha
   where fecha is not null
  -- `unnest` puede traer repetidos si el formulario los mandó dos veces.
  on conflict (group_id, happens_on) do nothing;

  select count(*)::int into v_count
    from public.group_endulzadas where group_id = p_group;

  return v_count;
end;
$fn$;

revoke execute on function public.set_group_endulzadas(uuid, date[]) from public;
grant execute on function public.set_group_endulzadas(uuid, date[]) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. El roster ahora prefiere el apodo
--    Gana una columna (`nickname`), así que cambia el tipo de retorno y toca
--    DROP antes del CREATE.
-- ----------------------------------------------------------------------------
drop function if exists public.group_roster(uuid);

create or replace function public.group_roster(p_group uuid)
returns table (
  member_id    uuid,
  user_id      uuid,
  name         text,
  nickname     text,
  avatar_url   text,
  birthday     date,
  is_me        boolean,
  is_admin     boolean,
  created_at   timestamptz
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select m.id, m.user_id,
         coalesce(
           nullif(trim(m.nickname), ''),
           nullif(trim(p.display_name), ''),
           m.shadow_name
         ),
         nullif(trim(m.nickname), ''),
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

revoke execute on function public.group_roster(uuid) from public;
grant execute on function public.group_roster(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. La pantalla de invitación también muestra apodos
--    Mismo tipo de retorno, así que `create or replace` basta.
-- ----------------------------------------------------------------------------
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
                       'name', coalesce(
                                 nullif(trim(m.nickname), ''),
                                 nullif(trim(p.display_name), ''),
                                 m.shadow_name
                               ),
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

revoke execute on function public.get_join_details(text) from public;
grant execute on function public.get_join_details(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. `my_groups()`: próxima endulzada, cuántas van, y apodos en las caritas
--
--    Se borra ANTES de quitar `groups.endulzada_at`, porque el cuerpo de la
--    función vieja todavía nombra esa columna.
-- ----------------------------------------------------------------------------
drop function if exists public.my_groups();

alter table public.groups drop column if exists endulzada_at;

create or replace function public.my_groups()
returns table (
  id               uuid,
  name             text,
  status           public.group_status,
  admin_id         uuid,
  is_admin         boolean,
  emoji            text,
  budget_endulzada numeric,
  budget_regalo    numeric,
  currency         text,
  next_endulzada   date,
  endulzada_count  integer,
  reveal_at        date,
  member_count     integer,
  members          jsonb,
  created_at       timestamptz
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select g.id, g.name, g.status, g.admin_id,
         (g.admin_id = auth.uid()) as is_admin,
         g.emoji,
         g.budget_endulzada, g.budget_regalo, g.currency,
         -- La próxima que no ha pasado; si ya pasaron todas, queda en null.
         (select min(e.happens_on)
            from public.group_endulzadas e
           where e.group_id = g.id
             and e.happens_on >= current_date),
         (select count(*)::int
            from public.group_endulzadas e
           where e.group_id = g.id),
         g.reveal_at,
         (select count(*)::int from public.members m2 where m2.group_id = g.id),
         coalesce(
           (select jsonb_agg(sample order by sample_order)
              from (
                select jsonb_build_object(
                         'name', coalesce(
                                   nullif(trim(m.nickname), ''),
                                   nullif(trim(p.display_name), ''),
                                   m.shadow_name
                                 ),
                         'avatar_url', p.avatar_url
                       ) as sample,
                       m.created_at as sample_order
                  from public.members m
                  left join public.profiles p on p.id = m.user_id
                 where m.group_id = g.id
                 order by m.created_at
                 limit 6
              ) muestra),
           '[]'::jsonb
         ) as members,
         g.created_at
  from public.groups g
  where g.admin_id = auth.uid()
     or exists (
       select 1 from public.members m
       where m.group_id = g.id and m.user_id = auth.uid()
     )
  order by g.created_at desc;
$fn$;

revoke execute on function public.my_groups() from public;
grant execute on function public.my_groups() to authenticated;

-- ----------------------------------------------------------------------------
-- 7. `groups`: los grants de columna, sin `endulzada_at` (ya no existe)
-- ----------------------------------------------------------------------------
grant update (name, budget_endulzada, budget_regalo, currency, emoji, reveal_at)
  on public.groups to authenticated;
grant insert (name, admin_id, budget_endulzada, budget_regalo, currency, emoji,
              reveal_at)
  on public.groups to authenticated;

-- ----------------------------------------------------------------------------
-- 8. Prioridad de los antojos
--
--    `sort_order` es NULLABLE a propósito, sin default. Un antojo nuevo entra
--    con null y las consultas lo mandan al final (`nulls last`); en cambio los
--    que ya se ordenaron a mano tienen 1..N y se quedan donde los pusieron.
--    Con un default de 0 los nuevos se colarían de primeros, que es justo lo
--    contrario de lo que uno espera.
-- ----------------------------------------------------------------------------
alter table public.wishlists
  add column if not exists sort_order integer;
alter table public.profile_wishlists
  add column if not exists sort_order integer;

create index if not exists wishlists_order_idx
  on public.wishlists (member_id, type, sort_order nulls last, created_at);
create index if not exists profile_wishlists_order_idx
  on public.profile_wishlists (user_id, type, sort_order nulls last, created_at);

-- 8.1 Reordenar la lista de un parche.
--     Recibe el orden completo en vez de "sube este uno": así una sola
--     llamada sirve igual para las flechitas y para arrastrar, y no quedan
--     dos antojos peleando por el mismo puesto.
create or replace function public.reorder_wishlist(
  p_member uuid,
  p_type   public.wishlist_type,
  p_ids    uuid[]
)
returns integer
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_count integer;
begin
  if not exists (
    select 1 from public.members m
    where m.id = p_member and m.user_id = auth.uid()
  ) then
    raise exception 'Ese puesto no es tuyo' using errcode = '42501';
  end if;

  with orden as (
    select id, row_number() over () as posicion
      from unnest(p_ids) as id
  )
  update public.wishlists w
     set sort_order = orden.posicion
    from orden
   -- El filtro por member_id y type es la reja: un id de otra lista que
   -- venga en el arreglo no se toca.
   where w.id = orden.id
     and w.member_id = p_member
     and w.type = p_type;

  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

-- 8.2 Lo mismo para la lista base del perfil.
create or replace function public.reorder_profile_wishlist(
  p_type public.wishlist_type,
  p_ids  uuid[]
)
returns integer
language plpgsql security definer
set search_path = public, pg_temp as $fn$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión' using errcode = '42501';
  end if;

  with orden as (
    select id, row_number() over () as posicion
      from unnest(p_ids) as id
  )
  update public.profile_wishlists pw
     set sort_order = orden.posicion
    from orden
   where pw.id = orden.id
     and pw.user_id = auth.uid()
     and pw.type = p_type;

  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

revoke execute on function
  public.reorder_wishlist(uuid, public.wishlist_type, uuid[]) from public;
grant execute on function
  public.reorder_wishlist(uuid, public.wishlist_type, uuid[]) to authenticated;

revoke execute on function
  public.reorder_profile_wishlist(public.wishlist_type, uuid[]) from public;
grant execute on function
  public.reorder_profile_wishlist(public.wishlist_type, uuid[]) to authenticated;

-- 8.3 Al importar la lista base, respeta el orden que ya tenía.
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
    insert into public.wishlists
      (member_id, type, item_name, url, image_url, note, sort_order)
    select p_member, pw.type, pw.item_name, pw.url, pw.image_url, pw.note,
           pw.sort_order
      from public.profile_wishlists pw
     where pw.user_id = v_uid
       and (p_type is null or pw.type = p_type)
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

revoke execute on function
  public.import_profile_wishlist(uuid, public.wishlist_type) from public;
grant execute on function
  public.import_profile_wishlist(uuid, public.wishlist_type) to authenticated;
