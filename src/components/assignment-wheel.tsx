"use client";

import { useEffect, useRef, useState } from "react";
import { PartyPopper, Sparkles } from "lucide-react";

import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { markAssignmentRevealed } from "@/lib/actions/members";

type Slice = { name: string; avatarUrl: string | null };

/** Tres tintes y no dos: con un número impar de gajos, alternar dos deja el
 *  primero y el último del mismo color pegados. Con tres eso no pasa salvo en
 *  casos raros, y el borde blanco entre gajos lo termina de separar. */
const FILLS = [
  "var(--endulzada-soft)",
  "var(--regalo-soft)",
  "color-mix(in oklch, var(--primary), transparent 88%)",
];

const R = 46;
const CENTER = 50;

/** Ángulo medido desde arriba, en sentido del reloj, a coordenadas del SVG. */
function pointAt(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function slicePath(from: number, to: number) {
  const start = pointAt(from, R);
  const end = pointAt(to, R);
  const largeArc = to - from > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x.toFixed(2)} ${start.y.toFixed(
    2,
  )} A ${R} ${R} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

/**
 * La ruleta del sorteo, una sola vez por persona.
 *
 * Cómo funciona el truco: el resultado ya está decidido en la base desde que
 * el admin sorteó — la ruleta no decide nada. Se calcula el ángulo exacto que
 * deja el gajo del ganador bajo la aguja y se rota hasta ahí, con vueltas de
 * más para que se sienta un giro. Es teatro sobre un resultado que ya existe,
 * que es justo lo que permite que sea honesto y que no se pueda volver a
 * girar para cambiarlo.
 *
 * Los gajos van en SVG y no en `conic-gradient`: hacía falta un borde entre
 * gajos y rótulos que se puedan poner en el sitio exacto. Los nombres van
 * DERECHOS (contra-rotados), no radiales — radiales quedaban de cabeza en la
 * mitad izquierda.
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
  /** Se llama al terminar; recibe si conviene abrir la lista del ganador. */
  onDone: (options: { openList: boolean }) => void;
}) {
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [angle, setAngle] = useState(0);
  const wheelRef = useRef<SVGGElement>(null);

  const count = slices.length;
  const step = 360 / count;
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

    // El gajo `i` está centrado en `i * step + step / 2`. Para dejarlo bajo la
    // aguja (arriba) hay que rotar la rueda el negativo de eso.
    const target = -(winnerIndex * step + step / 2);
    const turns = reduced ? 0 : 5;

    setSpinning(true);
    setAngle(360 * turns + target);

    if (reduced) {
      setSpinning(false);
      setLanded(true);
      return;
    }

    const node = wheelRef.current;
    if (!node) {
      setSpinning(false);
      setLanded(true);
      return;
    }

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

      <div className="relative mx-auto w-full max-w-[300px]">
        <svg viewBox="0 0 100 108" className="w-full" aria-hidden>
          {/* la aguja, fija arriba */}
          <path
            d="M50 1 L45.5 9 L54.5 9 Z"
            fill="var(--primary)"
          />

          <g
            ref={wheelRef}
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: `${CENTER}px ${CENTER}px`,
              transition: spinning
                ? "transform 5s cubic-bezier(0.16, 0.72, 0.06, 1)"
                : undefined,
            }}
          >
            {slices.map((slice, index) => {
              const from = index * step;
              const to = from + step;
              const label = pointAt(from + step / 2, R * 0.66);
              const short =
                slice.name.length > 10
                  ? `${slice.name.slice(0, 9)}…`
                  : slice.name;

              return (
                <g key={`${slice.name}-${index}`}>
                  <path
                    d={slicePath(from, to)}
                    fill={FILLS[index % FILLS.length]}
                    stroke="var(--card)"
                    strokeWidth="0.8"
                  />
                  {/* Contra-rotado para que el nombre quede derecho. */}
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={count > 8 ? 4 : 5}
                    fontWeight="700"
                    fill="var(--foreground)"
                    opacity="0.85"
                    transform={`rotate(${-angle} ${label.x} ${label.y})`}
                    style={{
                      transition: spinning
                        ? "transform 5s cubic-bezier(0.16, 0.72, 0.06, 1)"
                        : undefined,
                    }}
                  >
                    {short}
                  </text>
                </g>
              );
            })}

            <circle
              cx={CENTER}
              cy={CENTER}
              r={R}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
            />
          </g>

          {/* el eje */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r="6"
            fill="var(--card)"
            stroke="var(--primary)"
            strokeWidth="2.5"
          />
        </svg>
      </div>

      {landed ? (
        <div className="space-y-3">
          <PartyPopper className="text-primary mx-auto size-6" aria-hidden />
          <p className="text-muted-foreground text-sm">Te salió…</p>
          <div className="flex flex-col items-center gap-2">
            {winner?.avatarUrl && (
              <PersonAvatar name={winner.name} src={winner.avatarUrl} size="lg" />
            )}
            <p className="text-primary text-3xl leading-tight font-extrabold break-words">
              {winner?.name}
            </p>
          </div>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => onDone({ openList: true })}>
              Ver su lista de antojos
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onDone({ openList: false })}
            >
              Después
            </Button>
          </div>
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
