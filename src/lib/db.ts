/**
 * The data access layer. Every read the UI performs goes through here.
 *
 * Two rules hold throughout:
 *  1. Reads run with the caller's session, so RLS is the real authority. The
 *     checks below shape the UI; they are not the security boundary.
 *  2. `members` is never selected with `*` — `assigned_to` and `claim_token`
 *     have no column grant, so `*` would be rejected by Postgres.
 */
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  AdminMember,
  Assignment,
  ClaimPreview,
  Group,
  GroupSummary,
  Member,
  Profile,
  WishlistItem,
} from "@/lib/types";

const MEMBER_COLUMNS = "id, group_id, user_id, shadow_name, created_at";

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

/** The signed-in user, or `null`. Never throws. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
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

/** The roster every participant may see: seat names, nothing else. */
export async function getRoster(groupId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("group_id", groupId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** The admin roster, with invite tokens. Rejected by Postgres for non-admins. */
export async function getAdminRoster(groupId: string): Promise<AdminMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_group_members", {
    p_group: groupId,
  });
  if (error) throw error;
  return data ?? [];
}

/** My own seat in a group, if I hold one. */
export async function getMyMember(
  groupId: string,
  userId: string,
): Promise<Member | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
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
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Invites                                                                    */
/* -------------------------------------------------------------------------- */

/** Anonymous-safe peek at an invite link: group name and seat label only. */
export async function getClaimPreview(
  token: string,
): Promise<ClaimPreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_claim_preview", {
    p_token: token,
  });
  if (error) {
    // An unknown token is a legitimate miss, so this page stays friendly
    // rather than throwing — but the reason belongs in the server log.
    console.error("get_claim_preview failed:", error.message);
    return null;
  }
  return data?.[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Composite loader for the group page                                        */
/* -------------------------------------------------------------------------- */

export type GroupPageData = {
  group: Group;
  roster: Member[];
  myMember: Member | null;
  isAdmin: boolean;
  assignment: Assignment | null;
  myItems: WishlistItem[];
  targetItems: WishlistItem[];
};

/** One call for everything `/g/[id]` renders. */
export async function getGroupPageData(
  groupId: string,
  userId: string,
): Promise<GroupPageData | null> {
  const [group, roster] = await Promise.all([
    getGroup(groupId),
    getRoster(groupId),
  ]);
  if (!group) return null;

  const myMember = roster.find((m) => m.user_id === userId) ?? null;
  const isAdmin = group.admin_id === userId;

  const assignment =
    group.status === "drawn" && myMember ? await getMyAssignment(groupId) : null;

  const [myItems, targetItems] = await Promise.all([
    myMember ? getWishlist(myMember.id) : Promise.resolve([]),
    assignment ? getWishlist(assignment.member_id) : Promise.resolve([]),
  ]);

  return { group, roster, myMember, isAdmin, assignment, myItems, targetItems };
}
