"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { type ActionState } from "./types";

export type AuthMode = "signin" | "signup";

/**
 * El resultado carga el modo en el que corrió.
 *
 * Sin eso, el formulario mostraba un mensaje viejo después de cambiar de
 * pestaña: intentabas registrarte, salía "ese correo ya tiene cuenta", te
 * pasabas a "Entrar" y el error seguía ahí. `useActionState` conserva el
 * estado entre renders, así que el mensaje tiene que decir a qué modo
 * pertenece para que la UI lo descarte cuando ya no aplica.
 */
export type AuthState = ActionState & { mode: AuthMode };

function reject(mode: AuthMode, message: string): AuthState {
  return { ok: false, mode, message };
}

function accept(mode: AuthMode, message: string): AuthState {
  return { ok: true, mode, message };
}

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  // Only same-origin paths, so a crafted `next` cannot bounce users off-site.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/** Los mensajes de Supabase vienen en inglés; acá se traducen los que salen. */
function translate(raw: string, mode: AuthMode) {
  const patterns: [RegExp, string][] = [
    [
      /invalid login credentials/i,
      "Correo o contraseña incorrectos.",
    ],
    [
      /user already registered|already been registered/i,
      "Ese correo ya tiene cuenta. Pásate a «Entrar» y usa tu contraseña.",
    ],
    [
      /email not confirmed/i,
      "Falta confirmar tu correo. Abre el enlace que te enviamos y vuelve.",
    ],
    [
      /password should be at least/i,
      "La contraseña necesita al menos 8 caracteres.",
    ],
    [
      /unable to validate email|invalid email/i,
      "Ese correo no parece válido.",
    ],
    [
      /email rate limit exceeded|only request this after/i,
      "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.",
    ],
    [/signups not allowed|signup is disabled/i, "El registro está cerrado."],
    [
      /database error saving new user/i,
      "No pudimos crear tu perfil. Avísale a quien administra la app.",
    ],
  ];

  for (const [pattern, message] of patterns) {
    if (pattern.test(raw)) return message;
  }
  return mode === "signup"
    ? "No pudimos crear tu cuenta."
    : "No pudimos iniciar tu sesión.";
}

/**
 * Entrar y registrarse en una sola acción.
 *
 * Van juntas porque el formulario alterna entre las dos: si cada modo tuviera
 * su propia acción habría que cambiar la que `useActionState` tiene tomada, y
 * ahí es donde se colaban los estados cruzados.
 */
export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const mode: AuthMode =
    formData.get("mode") === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return reject(mode, "Escribe tu correo y contraseña.");
  }

  const supabase = await createClient();

  if (mode === "signin") {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return reject(mode, translate(error.message, mode));
    redirect(next);
  }

  if (password.length < 8) {
    return reject(mode, "La contraseña necesita al menos 8 caracteres.");
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || email.split("@")[0] } },
  });

  if (error) return reject(mode, translate(error.message, mode));

  // Con la confirmación por correo activa todavía no hay sesión.
  if (!data.session) {
    return accept(
      mode,
      "Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve por acá.",
    );
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
