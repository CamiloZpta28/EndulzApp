"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/actions/auth";
import { idle } from "@/lib/actions/types";

type Mode = "signin" | "signup";

export function AuthForm({
  defaultMode = "signin",
  next,
}: {
  defaultMode?: Mode;
  next?: string;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const action = mode === "signup" ? signUp : signIn;
  const [state, formAction] = useActionState(action, idle);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />

        {mode === "signup" && (
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
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            placeholder="••••••••"
          />
          {mode === "signup" && (
            <p className="text-muted-foreground text-xs">Mínimo 8 caracteres.</p>
          )}
        </div>

        {state.message && (
          <Alert variant={state.ok ? "default" : "destructive"}>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <SubmitButton className="w-full" size="lg">
          {mode === "signup" ? "Crear cuenta" : "Entrar"}
        </SubmitButton>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {mode === "signup" ? "¿Ya tienes cuenta?" : "¿Primera vez por acá?"}{" "}
        <button
          type="button"
          className="text-primary font-medium underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Entra" : "Crea una cuenta"}
        </button>
      </p>
    </div>
  );
}
