"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { type ActionState, done, fail, toMessage } from "./types";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  // Only same-origin paths, so a crafted `next` cannot bounce users off-site.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return fail("Escribe tu correo y contraseña.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      return fail("Correo o contraseña incorrectos.");
    }
    return fail(toMessage(error, "No pudimos iniciar tu sesión."));
  }

  redirect(next);
}

export async function signUp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!email || !password) return fail("Escribe tu correo y contraseña.");
  if (password.length < 8) {
    return fail("La contraseña necesita al menos 8 caracteres.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || email.split("@")[0] } },
  });

  if (error) return fail(toMessage(error, "No pudimos crear tu cuenta."));

  // With email confirmations on, there is no session yet.
  if (!data.session) {
    return done("Te enviamos un correo para confirmar tu cuenta. Revísalo y vuelve.");
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
