"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, done, fail, toMessage } from "./types";

/**
 * Unirse a un grupo con el código del enlace.
 *
 * `public.join_group` es la autoridad: revalida el código, que el grupo no
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
  if (error) return fail(toMessage(error, "No pudimos unirte al grupo."));

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
  if (!groupId) return fail("Falta el grupo.");

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

  if (error) return fail(toMessage(error, "No pudimos quitar al amigo."));

  revalidatePath(`/g/${groupId}`);
  return done("Amigo eliminado del grupo.");
}

/**
 * Marca que ya giraste la ruleta. Firma simple: la llama un efecto, no un
 * `<form>`. El RPC solo escribe la primera vez, así que repetirla no borra el
 * registro ni deja volver a girar.
 */
export async function markAssignmentRevealed(groupId: string): Promise<void> {
  if (!groupId) return;
  const supabase = await createClient();
  await supabase.rpc("mark_assignment_revealed", { p_group: groupId });
  revalidatePath(`/g/${groupId}`);
}

/**
 * El apodo con el que apareces en ESTE grupo.
 *
 * Vacío = quítalo y vuelve a mostrarme como en mi perfil.
 *
 * Sirve igual para ponerse el propio y para que el admin le ponga uno a
 * alguien más: la política "members: rename" ya permite las dos cosas
 * (`user_id = auth.uid()` o ser admin del grupo), y el grant de columna
 * limita la escritura a `nickname`. No hace falta chequear acá quién es
 * quién — si no le corresponde, Postgres no deja pasar el UPDATE.
 */
export async function updateNickname(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const raw = String(formData.get("nickname") ?? "").trim();
  if (!memberId) return fail("Falta tu puesto en el grupo.");
  if (raw.length > 40) return fail("El apodo no puede pasar de 40 caracteres.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ nickname: raw || null })
    .eq("id", memberId);

  if (error) return fail(toMessage(error, "No pudimos guardar el apodo."));

  revalidatePath(`/g/${groupId}`);
  revalidatePath("/dashboard");
  return done(raw ? `Ahora apareces como ${raw} en este grupo.` : "Apodo quitado.");
}
