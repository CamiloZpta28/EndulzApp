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
export type WishlistType = "endulzada" | "regalo";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  admin_id: string;
  status: GroupStatus;
  budget_endulzada: number;
  budget_regalo: number;
  currency: string;
  drawn_at: string | null;
  created_at: string;
};

/** A roster row as any group participant may read it. */
export type Member = {
  id: string;
  group_id: string;
  user_id: string | null;
  shadow_name: string;
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
  created_at: string;
};

/** `public.get_my_assignment()` */
export type Assignment = {
  member_id: string;
  shadow_name: string;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
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

/** `public.my_groups()` */
export type GroupSummary = {
  id: string;
  name: string;
  status: GroupStatus;
  admin_id: string;
  is_admin: boolean;
  budget_endulzada: number;
  budget_regalo: number;
  currency: string;
  member_count: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
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
        };
        Update: {
          name?: string;
          budget_endulzada?: number;
          budget_regalo?: number;
          currency?: string;
        };
        Relationships: [];
      };
      members: {
        Row: Member;
        Insert: { group_id: string; shadow_name: string };
        Update: { shadow_name?: string };
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
        };
        Returns: string;
      };
      perform_draw: { Args: { p_group: string }; Returns: number };
      reset_draw: { Args: { p_group: string }; Returns: void };
    };
    Enums: {
      group_status: GroupStatus;
      wishlist_type: WishlistType;
    };
    CompositeTypes: Record<never, never>;
  };
};
