"use client";

import { TriangleAlert } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-14">
      <Card className="space-y-4 p-6 text-center">
        <TriangleAlert className="text-destructive mx-auto size-8" aria-hidden />
        <h1 className="text-xl font-bold">Algo se nos dañó</h1>
        <p className="text-muted-foreground text-sm">
          {error.message || "No pudimos cargar esta parte del parche."}
        </p>
        <div className="space-y-2">
          <Button className="w-full" onClick={reset}>
            Intentar otra vez
          </Button>
          <ButtonLink href="/dashboard" variant="outline" className="w-full">
            Ir a mis parches
          </ButtonLink>
        </div>
      </Card>
    </main>
  );
}
