"use client";

import { useEffect, useRef, useState } from "react";
import { PartyPopper, Sparkles } from "lucide-react";

import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { markAssignmentRevealed } from "@/lib/actions/members";

type Slice = { name: string; avatarUrl: string | null };

/**
 * La ruleta del sorteo, una sola vez por persona.
 *
 * Cómo funciona el truco: el resultado ya está decidido en la base desde que
 * el admin sorteó — la ruleta no decide nada. Se calcula el ángulo exacto que
 * deja el gajo del ganador arriba y se rota hasta ahí, con varias vueltas de
 * más para que se sienta un giro y no un salto. Es decir: la animación es
 * teatro sobre un resultado que ya existe, que es lo que permite que sea
 * honesta y que no se pueda "volver a girar" para cambiarla.
 *
 * Si no hay `prefers-reduced-motion`, gira 4 vueltas en 4.5 s con una curva
 * que desacelera al final. Con movimiento reducido, salta al resultado.
 */
export function AssignmentWheel({
  groupId,
  slices,
  winnerIndex,
  onDone,
}: {
  groupId: string;
  /** Todos los del grupo, para que la rueda tenga gajos reales. */
  slices: Slice[];
  /** Índice del que salió, dentro de `slices`. */
  winnerIndex: number;
  onDone: () => void;
}) {
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [angle, setAngle] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const count = slices.length;
  const sliceAngle = 360 / count;
  const winner = slices[winnerIndex];

  // Se marca en la base al aterrizar, no al montar: si alguien cierra la
  // pestaña antes de girar, la ruleta lo vuelve a esperar.
  useEffect(() => {
    if (!landed) return;
    void markAssignmentRevealed(groupId);
  }, [landed, groupId]);

  const spin = () => {
    if (spinning || landed) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // El gajo `i` está centrado en `i * sliceAngle + sliceAngle / 2`, medido
    // desde arriba en el sentido del reloj. Para dejarlo bajo la aguja hay que
    // rotar el negativo de eso.
    const target = -(winnerIndex * sliceAngle + sliceAngle / 2);
    const turns = reduced ? 0 : 4;

    setSpinning(true);
    setAngle(360 * turns + target);

    if (reduced) {
      setSpinning(false);
      setLanded(true);
      return;
    }

    const node = wheelRef.current;
    if (!node) return;

    const finish = () => {
      setSpinning(false);
      setLanded(true);
      node.removeEventListener("transitionend", finish);
    };
    node.addEventListener("transitionend", finish);
  };

  return (
    <div className="bg-card space-y-4 rounded-xl border p-5 text-center">
      <div className="space-y-1">
        <Sparkles className="text-primary mx-auto size-7" aria-hidden />
        <h3 className="text-lg font-bold">¡Ya hay sorteo!</h3>
        <p className="text-muted-foreground text-sm">
          Gira la ruleta para ver a quién le vas a endulzar la vida. Esto pasa
          una sola vez.
        </p>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[280px]">
        {/* la aguja */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1"
        >
          <div
            className="size-0 border-x-[9px] border-t-[16px] border-x-transparent"
            style={{ borderTopColor: "var(--primary)" }}
          />
        </div>

        <div
          ref={wheelRef}
          className="size-full rounded-full border-4 shadow-inner"
          style={{
            borderColor: "var(--primary)",
            transform: `rotate(${angle}deg)`,
            transition: spinning
              ? "transform 4.5s cubic-bezier(0.12, 0.7, 0.08, 1)"
              : undefined,
            // Los gajos son un cono cónico: un `conic-gradient` alternando los
            // dos acentos. Más liviano que dibujar N paths en SVG.
            background: `conic-gradient(${slices
              .map((_, index) => {
                const color =
                  index % 2 === 0 ? "var(--endulzada-soft)" : "var(--regalo-soft)";
                return `${color} ${index * sliceAngle}deg ${
                  (index + 1) * sliceAngle
                }deg`;
              })
              .join(", ")})`,
          }}
        >
          {slices.map((slice, index) => (
            <span
              key={`${slice.name}-${index}`}
              // Cada nombre se para en el centro de su gajo, mirando al centro.
              className="absolute top-1/2 left-1/2 origin-left text-[11px] font-semibold"
              style={{
                transform: `rotate(${
                  index * sliceAngle + sliceAngle / 2 - 90
                }deg) translateX(28px)`,
                maxWidth: "44%",
              }}
            >
              <span className="text-foreground/80 block truncate">
                {slice.name}
              </span>
            </span>
          ))}
        </div>

        {/* el centro */}
        <div
          aria-hidden
          className="bg-card absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-4"
          style={{ borderColor: "var(--primary)" }}
        />
      </div>

      {landed ? (
        <div className="space-y-3">
          <PartyPopper className="text-primary mx-auto size-6" aria-hidden />
          <p className="text-muted-foreground text-sm">Te salió…</p>
          <div className="flex flex-col items-center gap-2">
            {winner?.avatarUrl && (
              <PersonAvatar
                name={winner.name}
                src={winner.avatarUrl}
                size="lg"
              />
            )}
            <p className="text-primary text-3xl leading-tight font-extrabold break-words">
              {winner?.name}
            </p>
          </div>
          <Button className="w-full" onClick={onDone}>
            Ver su lista de antojos
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full"
          onClick={spin}
          disabled={spinning || count === 0}
        >
          {spinning ? "Girando…" : "¡Girar la ruleta!"}
        </Button>
      )}
    </div>
  );
}
