"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { type ActionState, done, fail, toMessage } from "./types";

/**
 * Add shadow participants by name. Accepts one name per line, so an admin can
 * paste a whole list at once. RLS allows this only for the group admin and
 * only while the group is still `pending`.
 */
export async function addMembers(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const raw = String(formData.get("names") ?? "");
  if (!groupId) return fail("Falta el grupo.");

  const names = raw
    .split(/[\n,;]/)
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (names.length === 0) return fail("Escribe al menos un nombre.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .insert(names.map((shadow_name) => ({ group_id: groupId, shadow_name })));

  if (error) return fail(toMessage(error, "No pudimos agregar a los parceros."));

  revalidatePath(`/g/${groupId}`);
  return done(
    names.length === 1
      ? `${names[0]} quedó en la lista.`
      : `${names.length} parceros agregados.`,
  );
}

export async function renameMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const shadowName = String(formData.get("shadow_name") ?? "").trim();

  if (!memberId) return fail("Falta el participante.");
  if (!shadowName) return fail("El nombre no puede quedar vacío.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ shadow_name: shadowName })
    .eq("id", memberId);

  if (error) return fail(toMessage(error, "No pudimos cambiar el nombre."));

  revalidatePath(`/g/${groupId}`);
  return done("Nombre actualizado.");
}

export async function removeMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  if (!memberId) return fail("Falta el participante.");

  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", memberId);

  if (error) return fail(toMessage(error, "No pudimos quitar al parcero."));

  revalidatePath(`/g/${groupId}`);
  return done("Parcero eliminado del grupo.");
}

/**
 * Bind a shadow seat to the signed-in account via its invite token.
 * `public.claim_member` re-checks the token, that the seat is free, and that
 * the caller does not already hold a seat in that group.
 */
export async function claimSeat(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return fail("Falta el enlace de invitación.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/claim/${token}`)}`);

  const { error } = await supabase.rpc("claim_member", { p_token: token });

  if (error) return fail(toMessage(error, "No pudimos reclamar tu puesto."));

  const { data: preview } = await supabase.rpc("get_claim_preview", {
    p_token: token,
  });
  const groupId = preview?.[0]?.group_id;

  revalidatePath("/dashboard");
  if (groupId) {
    revalidatePath(`/g/${groupId}`);
    redirect(`/g/${groupId}`);
  }
  redirect("/dashboard");
}
