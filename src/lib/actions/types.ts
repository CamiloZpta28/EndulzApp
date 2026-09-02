/** Shared shape for every Server Action, so `useActionState` stays uniform. */
export type ActionState = {
  ok: boolean;
  message?: string;
};

export const idle: ActionState = { ok: false };

export function fail(message: string): ActionState {
  return { ok: false, message };
}

export function done(message?: string): ActionState {
  return { ok: true, message };
}

/** Turn a Postgres/Supabase error into something a human can read. */
export function toMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message: unknown }).message);
    // Postgres privilege and RLS failures are noisy; say something useful.
    if (/row-level security|permission denied|42501/i.test(message)) {
      return "No tienes permiso para hacer eso.";
    }
    return message;
  }
  return fallback;
}
