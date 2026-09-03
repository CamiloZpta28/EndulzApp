"use client";

import { TriangleAlert, WifiOff } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Un fallo de red del navegador llega acá como `TypeError: Failed to fetch`,
 * que no le dice nada a nadie. Se detecta para poder explicar qué pasó y qué
 * hacer, en vez de mostrar el mensaje crudo.
 */
function isConnectionError(error: Error) {
  return /failed to fetch|networkerror|load failed|fetch failed|econnrefused/i.test(
    error.message,
  );
}

/**
 * Un error que revienta en el servidor llega al navegador SIN mensaje: React
 * lo reemplaza por «Minified React error #441 …» para no filtrar detalles del
 * servidor en producción. Mostrar ese texto es peor que no mostrar nada,
 * porque parece un fallo del navegador cuando en realidad el mensaje de
 * verdad está en los logs del servidor, indexado por `digest`.
 */
function isMaskedServerError(error: Error & { digest?: string }) {
  return (
    /react error #4?41|omitted in production/i.test(error.message) ||
    // Sin mensaje pero con digest: también es un error del servidor tapado.
    (!error.message && Boolean(error.digest))
  );
}

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const offline = isConnectionError(error);
  const masked = !offline && isMaskedServerError(error);

  return (
    <main className="flex flex-1 flex-col justify-center py-12">
      <Shell width="narrow">
        <Card className="space-y-4 p-6 text-center">
          {offline ? (
            <>
              <WifiOff className="text-muted-foreground mx-auto size-8" aria-hidden />
              <h1 className="text-xl font-bold">No llegamos al servidor</h1>
              <p className="text-muted-foreground text-sm">
                Se cortó la conexión a mitad de camino. Revisa tu internet y
                vuelve a intentar — no se perdió nada de lo que ya habías
                guardado.
              </p>
            </>
          ) : (
            <>
              <TriangleAlert className="text-destructive mx-auto size-8" aria-hidden />
              <h1 className="text-xl font-bold">Algo se nos dañó</h1>
              <p className="text-muted-foreground text-sm">
                {masked
                  ? "Falló algo del lado del servidor. Vuelve a intentar; si sigue pasando, pásale el código de abajo a quien administra la app."
                  : error.message || "No pudimos cargar esta parte del grupo."}
              </p>
            </>
          )}

          {/*
            El `digest` es lo ÚNICO con lo que se puede encontrar el error real
            en los logs del servidor. Sin él, un «#441» no se puede rastrear.
          */}
          {error.digest && (
            <p className="text-muted-foreground/80 font-mono text-xs break-all">
              código: {error.digest}
            </p>
          )}

          <div className="space-y-2">
            <Button className="w-full" onClick={reset}>
              Intentar otra vez
            </Button>
            <ButtonLink href="/dashboard" variant="outline" className="w-full">
              Ir a mis grupos
            </ButtonLink>
          </div>
        </Card>
      </Shell>
    </main>
  );
}
