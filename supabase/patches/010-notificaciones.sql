-- ============================================================================
-- Patch 010 — recordatorios por notificación
--
-- Corre después de 001–009. Idempotente.
--
-- CÓRRELO COMPLETO, no por pedazos: el editor SQL de Supabase envuelve todo
-- el script en UNA transacción.
--
--   1. `push_subscriptions`: a qué dispositivos hay que avisarle.
--   2. `reminder_log`: qué se envió ya, para no avisar dos veces.
--   3. `pending_reminders()`: lo que hay que mandar hoy, en una consulta.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Los dispositivos suscritos
--
--    Una fila por dispositivo, no por persona: alguien puede tener el celular
--    y el computador, y quiere el aviso en los dos. `endpoint` es único porque
--    es lo que identifica al dispositivo del lado del navegador.
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Cada quien maneja solo sus propios dispositivos. El cron no pasa por acá:
-- corre con `service_role`, que salta RLS.
drop policy if exists "push: own only" on public.push_subscriptions;
create policy "push: own only" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.push_subscriptions to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Registro de lo enviado
--
--    El cron puede correr dos veces (un reintento, un redeploy). Sin esto,
--    a la gente le llegaría el mismo recordatorio repetido. La llave única
--    es lo que hace que el segundo intento no haga nada.
-- ----------------------------------------------------------------------------
create table if not exists public.reminder_log (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  /** 'endulzada' o 'reveal'. */
  kind        text not null,
  /** El día del evento, no el día del envío: así "3 días antes" y "hoy" son
      dos avisos distintos del mismo evento y ninguno bloquea al otro. */
  target_date date not null,
  days_before integer not null,
  sent_at     timestamptz not null default now(),
  unique (group_id, user_id, kind, target_date, days_before)
);

alter table public.reminder_log enable row level security;
-- Nadie del lado del cliente necesita leerlo ni escribirlo.
revoke all on public.reminder_log from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Qué hay que mandar hoy
--
--    Devuelve una fila por (dispositivo × evento) pendiente. Se avisa dos
--    veces por evento: 3 días antes para que haya tiempo de comprar, y el
--    mismo día. El `left join` contra `reminder_log` es lo que evita repetir.
--
--    `security definer` y sin grant a `authenticated`: la llama el cron con la
--    llave de servicio. Un cliente no tiene por qué ver los dispositivos de
--    los demás.
-- ----------------------------------------------------------------------------
create or replace function public.pending_reminders(p_today date default null)
returns table (
  group_id    uuid,
  group_name  text,
  emoji       text,
  user_id     uuid,
  endpoint    text,
  p256dh      text,
  auth        text,
  kind        text,
  target_date date,
  days_before integer
)
language sql stable security definer
set search_path = public, pg_temp as $fn$
  with hoy as (select coalesce(p_today, current_date) as d),
  eventos as (
    -- Las endulzadas agendadas
    select e.group_id, e.happens_on as target_date, 'endulzada'::text as kind
      from public.group_endulzadas e, hoy
     where e.happens_on in (hoy.d, hoy.d + 3)
    union all
    -- El día del descubrimiento
    select g.id, g.reveal_at, 'reveal'::text
      from public.groups g, hoy
     where g.reveal_at is not null
       and g.reveal_at in (hoy.d, hoy.d + 3)
  )
  select g.id, g.name, g.emoji,
         s.user_id, s.endpoint, s.p256dh, s.auth,
         ev.kind, ev.target_date,
         (ev.target_date - hoy.d)::int as days_before
    from eventos ev
    join hoy on true
    join public.groups g on g.id = ev.group_id
    join public.members m on m.group_id = g.id and m.user_id is not null
    join public.push_subscriptions s on s.user_id = m.user_id
    left join public.reminder_log l
      on l.group_id = g.id
     and l.user_id = s.user_id
     and l.kind = ev.kind
     and l.target_date = ev.target_date
     and l.days_before = (ev.target_date - hoy.d)::int
   where l.id is null;
$fn$;

revoke execute on function public.pending_reminders(date) from public;

-- ----------------------------------------------------------------------------
-- 4. Marcar como enviado
--    `on conflict do nothing` para que dos corridas simultáneas del cron no
--    se peleen: la segunda simplemente no inserta.
-- ----------------------------------------------------------------------------
create or replace function public.mark_reminder_sent(
  p_group       uuid,
  p_user        uuid,
  p_kind        text,
  p_target_date date,
  p_days_before integer
)
returns void
language sql security definer
set search_path = public, pg_temp as $fn$
  insert into public.reminder_log
    (group_id, user_id, kind, target_date, days_before)
  values (p_group, p_user, p_kind, p_target_date, p_days_before)
  on conflict do nothing;
$fn$;

revoke execute on function
  public.mark_reminder_sent(uuid, uuid, text, date, integer) from public;

-- ----------------------------------------------------------------------------
-- 5. Botar una suscripción muerta
--    Cuando el navegador responde 404/410, el dispositivo ya no existe y hay
--    que sacarlo o el cron lo reintentaría para siempre.
-- ----------------------------------------------------------------------------
create or replace function public.drop_push_subscription(p_endpoint text)
returns void
language sql security definer
set search_path = public, pg_temp as $fn$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$fn$;

revoke execute on function public.drop_push_subscription(text) from public;
