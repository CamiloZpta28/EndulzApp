import { SearchX } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-14">
      <Card className="space-y-4 p-6 text-center">
        <SearchX className="text-muted-foreground mx-auto size-8" aria-hidden />
        <h1 className="text-xl font-bold">Por acá no hay nada</h1>
        <p className="text-muted-foreground text-sm">
          O el grupo no existe, o no eres parte de él.
        </p>
        <ButtonLink href="/dashboard" className="w-full">
          Ir a mis grupos
        </ButtonLink>
      </Card>
    </main>
  );
}
