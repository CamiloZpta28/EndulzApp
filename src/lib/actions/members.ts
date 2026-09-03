"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, done, fail, toMessage } from "./types";

/**
 * Unirse a un parche con el código del enlace.
 *
 * `public.join_group` es la autoridad: revalida el código, que el parche no
 * esté sorteado, y es idempotente si ya tienes puesto.
 */
export async function joinGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return fail("Falta el código de invitación.");

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);

  const { error } = await supabase.rpc("join_group", { p_code: code });
  if (error) return fail(toMessage(error, "No pudimos unirte al parche."));

  const { data: details } = await supabase.rpc("get_join_details", {
    p_code: code,
  });
  const groupId = details?.[0]?.group_id;

  revalidatePath("/dashboard");
  if (groupId) {
    revalidatePath(`/g/${groupId}`);
    redirect(`/g/${groupId}`);
  }
  redirect("/dashboard");
}

/** Genera un enlace nuevo y deja el anterior inservible. */
export async function rotateInviteCode(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  if (!groupId) return fail("Falta el parche.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("rotate_invite_code", {
    p_group: groupId,
  });
  if (error) return fail(toMessage(error, "No pudimos cambiar el enlace."));

  revalidatePath(`/g/${groupId}`);
  return done("Enlace nuevo listo. El anterior ya no sirve.");
}

/** El admin puede sacar a alguien mientras no se haya sorteado. */
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
  return done("Parcero eliminado del parche.");
}
