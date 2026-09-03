"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AuthMode, type AuthState, authenticate } from "@/lib/actions/auth";

const INITIAL: AuthState = { ok: false, mode: "signin" };

export function AuthForm({
  defaultMode = "signin",
  next,
}: {
  defaultMode?: AuthMode;
  next?: string;
}) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  // Una sola acción para los dos modos: el modo viaja en el formulario. Antes
  // esto cambiaba la acción que tenía tomada `useActionState`, y el estado se
  // cruzaba entre modos.
  const [state, formAction] = useActionState(authenticate, INITIAL);

  const signup = mode === "signup";
  // Un mensaje del otro modo ya no aplica: se descarta en vez de quedarse.
  const message = state.mode === mode ? state.message : undefined;

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="mode" value={mode} />

        {signup && (
          <div className="space-y-2">
            <Label htmlFor="display_name">¿Cómo te llamas?</Label>
            <Input
              id="display_name"
              name="display_name"
              autoComplete="name"
              placeholder="Camilo"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="tu@correo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={signup ? 8 : undefined}
            placeholder="••••••••"
          />
          {signup && (
            <p className="text-muted-foreground text-xs">Mínimo 8 caracteres.</p>
          )}
        </div>

        {message && (
          <Alert variant={state.ok ? "default" : "destructive"}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <SubmitButton className="w-full" size="lg">
          {signup ? "Crear cuenta" : "Entrar"}
        </SubmitButton>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {signup ? "¿Ya tienes cuenta?" : "¿Primera vez por acá?"}{" "}
        <button
          type="button"
          className="text-primary font-medium underline-offset-4 hover:underline"
          onClick={() => setMode(signup ? "signin" : "signup")}
        >
          {signup ? "Entra" : "Crea una cuenta"}
        </button>
      </p>
    </div>
  );
}
