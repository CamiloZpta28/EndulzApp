/**
 * Hand-written mirror of `supabase/schema.sql`.
 *
 * Regenerate instead with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/types.ts
 *
 * Note the deliberate omissions: `members.assigned_to` and
 * `members.claim_token` are not selectable columns for any client role (see
 * §5 of the schema), so they are absent from the `Row` types on purpose —
 * TypeScript then refuses the queries Postgres would reject anyway.
 */

export type GroupStatus = "pending" | "drawn";
/**
 * Las tres secciones de una lista. `vetado` no es una categoría de
 * presupuesto: es lo que NO se quiere recibir. Va en el mismo enum porque
 * comparte todo lo demás (foto, nota, link, prioridad, importar del perfil).
 */
export type WishlistType = "endulzada" | "regalo" | "vetado";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  birthday: string | null;
  phone: string | null;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  emoji: string | null;
  invite_code: string;
  admin_id: string;
  status: GroupStatus;
  budget_endulzada: number;
  budget_regalo: number;
  currency: string;
  /** El día del descubrimiento (`YYYY-MM-DD`). */
  reveal_at: string | null;
  drawn_at: string | null;
  created_at: string;
};

/** A roster row as any group participant may read it. */
export type Member = {
  id: string;
  group_id: string;
  user_id: string | null;
  shadow_name: string;
  nickname: string | null;
  created_at: string;
};

/** Un item de la lista base del perfil, la que se importa a los grupos. */
export type ProfileWishlistItem = {
  id: string;
  user_id: string;
  type: WishlistType;
  item_name: string;
  url: string | null;
  image_url: string | null;
  note: string | null;
  /** Prioridad: 1 es lo que más quiere. `null` = sin ordenar, va al final. */
  sort_order: number | null;
  created_at: string;
};

export type WishlistItem = {
  id: string;
  member_id: string;
  type: WishlistType;
  item_name: string;
  url: string | null;
  image_url: string | null;
  note: string | null;
  /** Prioridad: 1 es lo que más quiere. `null` = sin ordenar, va al final. */
  sort_order: number | null;
  created_at: string;
};

/** `public.get_my_assignment()` */
export type Assignment = {
  member_id: string;
  /** Ya resuelto por la base: apodo > nombre del perfil > nombre de entrada. */
  name: string;
  /** El apodo crudo. `null` = no tiene apodo en este grupo. */
  nickname: string | null;
  user_id: string | null;
  avatar_url: string | null;
  /** `false` = todavía no ha girado la ruleta. */
  already_revealed: boolean;
};

/** Una endulzada agendada. */
export type GroupEndulzada = {
  id: string;
  group_id: string;
  happens_on: string;
  created_at: string;
};

/** `public.group_roster()` — nombres y fotos de quienes están en el grupo. */
export type RosterMember = {
  member_id: string;
  user_id: string | null;
  /** Ya resuelto: apodo del grupo, si no el nombre del perfil. */
  name: string;
  /** El apodo crudo, para precargar el campo. `null` = no tiene. */
  nickname: string | null;
  avatar_url: string | null;
  birthday: string | null;
  is_me: boolean;
  is_admin: boolean;
  created_at: string;
};

/** `public.get_join_preview()` — lo que ve un visitante sin sesión. */
export type JoinPreview = {
  group_name: string;
  emoji: string | null;
  member_count: number;
  status: GroupStatus;
};

/** `public.get_join_details()` — la pantalla de confirmación, ya con sesión. */
export type JoinDetails = {
  group_id: string;
  group_name: string;
  emoji: string | null;
  status: GroupStatus;
  already_member: boolean;
  is_admin: boolean;
  members: { name: string; avatar_url: string | null }[];
};

/** `public.admin_group_members()` */
export type AdminMember = {
  id: string;
  shadow_name: string;
  user_id: string | null;
  claim_token: string;
  claimed: boolean;
  created_at: string;
};

/** `public.get_claim_preview()` */
export type ClaimPreview = {
  group_id: string;
  group_name: string;
  shadow_name: string;
  claimed: boolean;
  status: GroupStatus;
};

/** Un dispositivo suscrito a recordatorios. */
export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

/** `public.pending_reminders()` — lo que el cron tiene que mandar hoy. */
export type PendingReminder = {
  group_id: string;
  group_name: string;
  emoji: string | null;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  kind: string;
  target_date: string;
  days_before: number;
};

/** Una carita para la tarjeta del grupo. */
export type MemberChip = { name: string; avatar_url: string | null };

/** `public.my_groups()` */
export type GroupSummary = {
  id: string;
  name: string;
  status: GroupStatus;
  admin_id: string;
  is_admin: boolean;
  emoji: string | null;
  budget_endulzada: number;
  budget_regalo: number;
  currency: string;
  /** La próxima endulzada que no ha pasado; `null` si ya pasaron todas. */
  next_endulzada: string | null;
  endulzada_count: number;
  reveal_at: string | null;
  member_count: number;
  /** Hasta 6, en orden de llegada. */
  members: MemberChip[];
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      groups: {
        Row: Group;
        Insert: {
          name: string;
          admin_id: string;
          budget_endulzada?: number;
          budget_regalo?: number;
          currency?: string;
          emoji?: string | null;
          reveal_at?: string | null;
        };
        Update: {
          name?: string;
          budget_endulzada?: number;
          budget_regalo?: number;
          currency?: string;
          emoji?: string | null;
          reveal_at?: string | null;
        };
        Relationships: [];
      };
      members: {
        Row: Member;
        Insert: { group_id: string; shadow_name: string };
        Update: { shadow_name?: string; nickname?: string | null };
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
        };
        Update: { user_agent?: string | null };
        Relationships: [];
      };
      group_endulzadas: {
        Row: GroupEndulzada;
        Insert: { group_id: string; happens_on: string };
        Update: { happens_on?: string };
        Relationships: [];
      };
      profile_wishlists: {
        Row: ProfileWishlistItem;
        Insert: {
          user_id: string;
          type: WishlistType;
          item_name: string;
          url?: string | null;
          image_url?: string | null;
          note?: string | null;
        };
        Update: {
          item_name?: string;
          type?: WishlistType;
          url?: string | null;
          image_url?: string | null;
          note?: string | null;
        };
        Relationships: [];
      };
      wishlists: {
        Row: WishlistItem;
        Insert: {
          member_id: string;
          type: WishlistType;
          item_name: string;
          url?: string | null;
          image_url?: string | null;
          note?: string | null;
        };
        Update: {
          item_name?: string;
          type?: WishlistType;
          url?: string | null;
          image_url?: string | null;
          note?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      my_groups: { Args: Record<never, never>; Returns: GroupSummary[] };
      get_my_assignment: { Args: { p_group: string }; Returns: Assignment[] };
      admin_group_members: { Args: { p_group: string }; Returns: AdminMember[] };
      get_claim_preview: { Args: { p_token: string }; Returns: ClaimPreview[] };
      claim_member: { Args: { p_token: string }; Returns: string };
      create_group: {
        Args: {
          p_name: string;
          p_budget_endulzada?: number;
          p_budget_regalo?: number;
          p_currency?: string;
          p_seat_name?: string | null;
          p_emoji?: string | null;
        };
        Returns: string;
      };
      perform_draw: { Args: { p_group: string }; Returns: number };
      group_roster: { Args: { p_group: string }; Returns: RosterMember[] };
      get_join_preview: { Args: { p_code: string }; Returns: JoinPreview[] };
      get_join_details: { Args: { p_code: string }; Returns: JoinDetails[] };
      join_group: { Args: { p_code: string }; Returns: string };
      rotate_invite_code: { Args: { p_group: string }; Returns: string };
      mark_assignment_revealed: { Args: { p_group: string }; Returns: void };
      pending_reminders: {
        Args: { p_today?: string | null };
        Returns: PendingReminder[];
      };
      mark_reminder_sent: {
        Args: {
          p_group: string;
          p_user: string;
          p_kind: string;
          p_target_date: string;
          p_days_before: number;
        };
        Returns: void;
      };
      drop_push_subscription: { Args: { p_endpoint: string }; Returns: void };
      set_group_endulzadas: {
        Args: { p_group: string; p_dates: string[] };
        Returns: number;
      };
      reorder_wishlist: {
        Args: { p_member: string; p_type: WishlistType; p_ids: string[] };
        Returns: number;
      };
      reorder_profile_wishlist: {
        Args: { p_type: WishlistType; p_ids: string[] };
        Returns: number;
      };
      import_profile_wishlist: {
        Args: { p_member: string; p_type?: WishlistType | null };
        Returns: number;
      };
      reset_draw: { Args: { p_group: string }; Returns: void };
    };
    Enums: {
      group_status: GroupStatus;
      wishlist_type: WishlistType;
    };
    CompositeTypes: Record<never, never>;
  };
};
