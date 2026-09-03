"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  parseMoney,
} from "@/lib/currencies";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, done, fail, toMessage } from "./types";

/** Un emoji, o nada. Se recorta por code points, no por chars, para no
 *  partir un emoji compuesto (👨‍👩‍👧 son varios code points más ZWJ). */
function parseEmoji(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const points = [...raw];
  return points.length <= 8 ? points.join("") : points.slice(0, 8).join("");
}

/** `YYYY-MM-DD`, o `null`. Cualquier cosa rara se descarta en vez de guardarse. */
function parseDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : raw;
}

/** Solo códigos que la app conoce; cualquier otro cae al de por defecto. */
function parseCurrency(value: FormDataEntryValue | null) {
  const code = String(value ?? "").toUpperCase();
  return isCurrencyCode(code) ? code : DEFAULT_CURRENCY;
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
    p_currency: parseCurrency(formData.get("currency")),
    p_seat_name: String(formData.get("admin_seat_name") ?? "").trim() || null,
    p_emoji: parseEmoji(formData.get("emoji")),
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
      currency: parseCurrency(formData.get("currency")),
      emoji: parseEmoji(formData.get("emoji")),
      // Estaba faltando: el formulario mandaba la fecha y esta acción no la
      // leía, así que nunca se guardaba y la tarjeta no tenía qué mostrar.
      reveal_at: parseDate(formData.get("reveal_at")),
    })
    .eq("id", groupId);

  if (error) return fail(toMessage(error, "No pudimos guardar los cambios."));

  // El calendario de endulzadas vive en su propia tabla; se reemplaza entero
  // con un RPC para que no quede a medias.
  const dates = formData
    .getAll("endulzada_dates")
    .map((value) => parseDate(value))
    .filter((value): value is string => value !== null);

  const { error: datesError } = await supabase.rpc("set_group_endulzadas", {
    p_group: groupId,
    p_dates: dates,
  });

  if (datesError) {
    return fail(toMessage(datesError, "No pudimos guardar las endulzadas."));
  }

  revalidatePath(`/g/${groupId}`);
  revalidatePath("/dashboard");
  return done("Listo, parche actualizado.");
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
