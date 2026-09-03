-- ============================================================================
-- Patch 004 — fechas del parche y tarjeta con caritas
--
-- Corre después de 001, 002 y 003. Idempotente.
--
-- CÓRRELO COMPLETO, no por pedazos: el editor SQL de Supabase envuelve todo
-- el script en UNA transacción, así que si algo falla a mitad de camino se
-- revierte también lo que ya había pasado (incluidos los ALTER TABLE de
-- arriba). Correr solo la parte que falló deja el resto sin aplicar.
--
--   1. `groups.endulzada_at` y `groups.reveal_at`
--   2. `my_groups()` devuelve además las fechas y una muestra de integrantes
--      con foto, para poder pintar la tarjeta del dashboard sin una consulta
--      por parche.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fechas
-- ----------------------------------------------------------------------------
alter table public.groups
  add column if not exists endulzada_at date,
  add column if not exists reveal_at date;

comment on column public.groups.endulzada_at is
  'Próxima entrega de endulzada. La mueve el admin cada vez que pasa.';
comment on column public.groups.reveal_at is
  'El día del descubrimiento: cuando se revela quién le tenía a quién.';

-- Las fechas las edita el admin, igual que los topes.
grant update (name, budget_endulzada, budget_regalo, currency, emoji,
              endulzada_at, reveal_at)
  on public.groups to authenticated;
grant insert (name, admin_id, budget_endulzada, budget_regalo, currency, emoji,
              endulzada_at, reveal_at)
  on public.groups to authenticated;

-- ----------------------------------------------------------------------------
-- 2. `my_groups()` con fechas y muestra de integrantes
--
--    La muestra viene acá y no en una consulta aparte porque el dashboard
--    pinta N tarjetas: pedir el roster de cada parche serían N+1 viajes.
--    Se limita a 6 caritas — es lo que cabe en la tarjeta, y traer 40 avatares
--    de un parche grande solo para recortarlos en el cliente es desperdicio.
--
--    Va con DROP antes del CREATE: `create or replace` no puede cambiar el
--    tipo de retorno de una función que ya existe, y acá el `TABLE (...)` gana
--    columnas (`42P13: cannot change return type of existing function`).
--    Nada depende de esta función, así que el DROP es seguro — y va sin
--    CASCADE a propósito, para que falle en vez de arrastrarse algo callado.
-- ----------------------------------------------------------------------------
drop function if exists public.my_groups();

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
  endulzada_at     date,
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
         g.endulzada_at, g.reveal_at,
         (select count(*)::int from public.members m2 where m2.group_id = g.id),
         coalesce(
           (select jsonb_agg(sample order by sample_order)
              from (
                select jsonb_build_object(
                         'name', coalesce(nullif(trim(p.display_name), ''), m.shadow_name),
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
