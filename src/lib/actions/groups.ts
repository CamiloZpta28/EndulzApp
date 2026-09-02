"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { type ActionState, done, fail, toMessage } from "./types";

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function createGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Ponle un nombre al grupo.");

  const supabase = await createClient();

  // One RPC so the group and the admin's own (pre-claimed) seat land together.
  const { data: groupId, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_budget_endulzada: parseMoney(formData.get("budget_endulzada")),
    p_budget_regalo: parseMoney(formData.get("budget_regalo")),
    p_currency: String(formData.get("currency") ?? "COP").toUpperCase().slice(0, 3),
    p_seat_name: String(formData.get("admin_seat_name") ?? "").trim() || null,
  });

  if (error || !groupId) {
    return fail(toMessage(error, "No pudimos crear el grupo."));
  }

  revalidatePath("/dashboard");
  redirect(`/g/${groupId}`);
}

export async function updateGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!groupId) return fail("Falta el grupo.");
  if (!name) return fail("El grupo necesita un nombre.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update({
      name,
      budget_endulzada: parseMoney(formData.get("budget_endulzada")),
      budget_regalo: parseMoney(formData.get("budget_regalo")),
      currency: String(formData.get("currency") ?? "COP").toUpperCase().slice(0, 3),
    })
    .eq("id", groupId);

  if (error) return fail(toMessage(error, "No pudimos guardar los cambios."));

  revalidatePath(`/g/${groupId}`);
  revalidatePath("/dashboard");
  return done("Listo, presupuestos actualizados.");
}

/**
 * Runs the derangement in Postgres (`public.perform_draw`), which re-checks
 * that the caller is the admin and that the group has not been drawn yet.
 */
export async function drawGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  if (!groupId) return fail("Falta el grupo.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("perform_draw", {
    p_group: groupId,
  });

  if (error) return fail(toMessage(error, "El sorteo no se pudo hacer."));

  revalidatePath(`/g/${groupId}`);
  revalidatePath("/dashboard");
  return done(`¡Sorteo hecho con ${data} parceros! Ya puedes ver a quién te salió.`);
}

export async function resetDraw(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  if (!groupId) return fail("Falta el grupo.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_draw", { p_group: groupId });

  if (error) return fail(toMessage(error, "No pudimos reiniciar el sorteo."));

  revalidatePath(`/g/${groupId}`);
  revalidatePath("/dashboard");
  return done("Sorteo reiniciado. Los emparejamientos se borraron.");
}

export async function deleteGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  if (!groupId) return fail("Falta el grupo.");

  const supabase = await createClient();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);

  if (error) return fail(toMessage(error, "No pudimos borrar el grupo."));

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
