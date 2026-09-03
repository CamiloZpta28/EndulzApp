/**
 * The data access layer. Every read the UI performs goes through here.
 *
 * Two rules hold throughout:
 *  1. Reads run with the caller's session, so RLS is the real authority. The
 *     checks below shape the UI; they are not the security boundary.
 *  2. Anything that has to combine `members` with `profiles` goes through an
 *     RPC, because `profiles` only lets you read your own row — group-mates'
 *     names and photos come from `public.group_roster`.
 */
import { redirect } from "next/navigation";

import { getSessionUser, type SessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type {
  Assignment,
  Group,
  GroupEndulzada,
  GroupSummary,
  JoinDetails,
  JoinPreview,
  Profile,
  ProfileWishlistItem,
  RosterMember,
  WishlistItem,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Session and profile                                                        */
/* -------------------------------------------------------------------------- */

/** The signed-in user, or `null`. Never throws. */
export async function getUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  return getSessionUser(supabase);
}

/** The signed-in user, or a redirect to `/login?next=…`. */
export async function requireUser(nextPath?: string) {
  const user = await getUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** La lista base del perfil, la que se importa a los parches. */
export async function getProfileWishlist(): Promise<ProfileWishlistItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_wishlists")
    .select("*")
    // Prioridad primero; lo que nunca se ordenó va al final por antigüedad.
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Groups                                                                     */
/* -------------------------------------------------------------------------- */

/** Every group I administer or take part in, newest first. */
export async function getMyGroups(): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_groups");
  if (error) throw error;
  return data ?? [];
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();
  // `maybeSingle()` reports "no rows" as data:null with no error, so anything
  // in `error` is a real failure. Swallowing it here once turned a
  // `42501 permission denied` into a silent "this group does not exist".
  if (error) throw error;
  return data ?? null;
}

/** Roster con nombre, foto y cumpleaños de cada integrante. */
export async function getRoster(groupId: string): Promise<RosterMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_roster", {
    p_group: groupId,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Who did I draw? `null` before the draw, or if I only administer the group
 * without taking part in it.
 */
export async function getMyAssignment(
  groupId: string,
): Promise<Assignment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_assignment", {
    p_group: groupId,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Wishlists                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A seat's wishlist. RLS returns rows only for my own seat or the seat I
 * drew — for anybody else this comes back empty rather than forbidden.
 */
export async function getWishlist(memberId: string): Promise<WishlistItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select("*")
    .eq("member_id", memberId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** Las endulzadas agendadas del parche, de la más próxima a la más lejana. */
export async function getEndulzadas(
  groupId: string,
): Promise<GroupEndulzada[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_endulzadas")
    .select("*")
    .eq("group_id", groupId)
    .order("happens_on");
  if (error) throw error;
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Invitaciones                                                               */
/* -------------------------------------------------------------------------- */

/** Sin sesión: nombre, emoji y cuántos van. Deliberadamente sin nombres. */
export async function getJoinPreview(code: string): Promise<JoinPreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_join_preview", {
    p_code: code,
  });
  if (error) {
    // Un código inexistente es una falla legítima de la ruta, no un 500.
    console.error("get_join_preview failed:", error.message);
    return null;
  }
  return data?.[0] ?? null;
}

/** Con sesión: la pantalla de "¿quieres unirte?", ya con los integrantes. */
export async function getJoinDetails(code: string): Promise<JoinDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_join_details", {
    p_code: code,
  });
  if (error) {
    console.error("get_join_details failed:", error.message);
    return null;
  }
  return data?.[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Composite loader for the group page                                        */
/* -------------------------------------------------------------------------- */

export type GroupPageData = {
  group: Group;
  roster: RosterMember[];
  myMember: RosterMember | null;
  isAdmin: boolean;
  assignment: Assignment | null;
  myItems: WishlistItem[];
  targetItems: WishlistItem[];
  profileItemCount: number;
  endulzadas: GroupEndulzada[];
};

/** One call for everything `/g/[id]` renders. */
export async function getGroupPageData(
  groupId: string,
  userId: string,
): Promise<GroupPageData | null> {
  const [group, roster, endulzadas] = await Promise.all([
    getGroup(groupId),
    getRoster(groupId),
    getEndulzadas(groupId),
  ]);
  if (!group) return null;

  const myMember = roster.find((m) => m.is_me) ?? null;
  const isAdmin = group.admin_id === userId;

  const assignment =
    group.status === "drawn" && myMember ? await getMyAssignment(groupId) : null;

  const [myItems, targetItems, profileItems] = await Promise.all([
    myMember ? getWishlist(myMember.member_id) : Promise.resolve([]),
    assignment ? getWishlist(assignment.member_id) : Promise.resolve([]),
    // Solo para saber si tiene sentido ofrecer el botón de importar.
    myMember ? getProfileWishlist() : Promise.resolve([]),
  ]);

  return {
    group,
    roster,
    myMember,
    isAdmin,
    assignment,
    myItems,
    targetItems,
    profileItemCount: profileItems.length,
    endulzadas,
  };
}
