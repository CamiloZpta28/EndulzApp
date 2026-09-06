"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  Sparkles,
  User,
  X,
} from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { WISHLIST_META, WISHLIST_ORDER } from "@/lib/wishlist-meta";

/**
 * El recorrido de bienvenida.
 *
 * Las ilustraciones son maquetas de la propia interfaz hechas con divs y con
 * los mismos iconos y colores que usa la app, en vez de dibujos aparte: así lo
 * que se ve acá es literalmente lo que se va a encontrar después, y no queda
 * una segunda paleta que mantener sincronizada — `WISHLIST_META` es la misma
 * que pinta las listas de verdad.
 */

/* -------------------------------------------------------------------------- */
/* "Ya lo vi", guardado en el navegador                                       */
/* -------------------------------------------------------------------------- */

/**
 * `localStorage` es un sistema externo a React, así que se lee con
 * `useSyncExternalStore` y no con un efecto: en el servidor no existe, y la
 * instantánea del servidor dice "no lo ha visto" para que el HTML traiga la
 * tarjeta puesta. Justo después de hidratar, React compara con lo que hay en
 * el navegador y la quita si ya la habían cerrado.
 *
 * El valor se guarda en el módulo porque `getSnapshot()` corre en cada render
 * y no vale la pena tocar el disco cada vez.
 */
const STORAGE_KEY = "endulzapp:tutorial-visto";

let visto: boolean | null = null;
const oyentes = new Set<() => void>();

function getSnapshot() {
  if (visto === null) {
    try {
      visto = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Modo privado de Safari, cookies bloqueadas: se asume que no lo ha visto.
      visto = false;
    }
  }
  return visto;
}

/** En el servidor no hay navegador; se asume que la tarjeta va puesta. */
function getServerSnapshot() {
  return false;
}

function subscribe(alCambiar: () => void) {
  oyentes.add(alCambiar);
  return () => {
    oyentes.delete(alCambiar);
  };
}

function marcarVisto() {
  visto = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Sin almacenamiento el tutorial vuelve a salir. Es molesto, no roto.
  }
  for (const alCambiar of oyentes) alCambiar();
}

/* -------------------------------------------------------------------------- */
/* Piezas de las maquetas                                                     */
/* -------------------------------------------------------------------------- */

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/40 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed px-3">
      {children}
    </div>
  );
}

function MiniCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-card ring-foreground/10 rounded-lg p-2.5 shadow-sm ring-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Una línea de texto de mentiras. */
function Bar({ className }: { className?: string }) {
  return (
    <span
      className={cn("bg-foreground/15 block h-1.5 rounded-full", className)}
      aria-hidden
    />
  );
}

/** Las tres secciones de una lista, con su icono y su color de verdad. */
function ListRows({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {WISHLIST_ORDER.map((type) => {
        const meta = WISHLIST_META[type];
        const Icon = meta.icon;
        return (
          <div key={type} className="flex items-center gap-1.5">
            <Icon
              className={compact ? "size-2.5" : "size-3.5"}
              style={{ color: meta.color }}
              aria-hidden
            />
            <Bar className={compact ? "w-10" : "w-20"} />
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Una ilustración por paso                                                   */
/* -------------------------------------------------------------------------- */

function ArtListaBase() {
  return (
    <Frame>
      <MiniCard className="w-48 space-y-2.5">
        <div className="flex items-center gap-2 border-b pb-2">
          <span className="bg-primary/15 text-primary flex size-7 items-center justify-center rounded-full">
            <User className="size-3.5" aria-hidden />
          </span>
          <div className="space-y-1">
            <Bar className="w-16" />
            <Bar className="bg-foreground/10 w-10" />
          </div>
        </div>
        <ListRows />
      </MiniCard>
    </Frame>
  );
}

function ArtGrupo() {
  const tints = [
    "bg-primary/30",
    "bg-foreground/20",
    "bg-primary/20",
    "bg-foreground/15",
  ];

  return (
    <Frame>
      <MiniCard className="w-52 space-y-2.5">
        <div className="flex items-center gap-2">
          <span
            className="bg-muted flex size-8 items-center justify-center rounded-lg text-base"
            aria-hidden
          >
            🎁
          </span>
          <div className="space-y-1">
            <Bar className="w-20" />
            <Bar className="bg-foreground/10 w-12" />
          </div>
        </div>

        <div className="flex -space-x-1.5" aria-hidden>
          {tints.map((tint) => (
            <span
              key={tint}
              className={cn("border-card size-6 rounded-full border-2", tint)}
            />
          ))}
          <span className="border-card bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full border-2 text-[9px] font-medium">
            +3
          </span>
        </div>

        <div className="bg-muted text-muted-foreground flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px]">
          <Link2 className="size-3 shrink-0" aria-hidden />
          <span className="truncate">endulzapp.com/join/A7K2</span>
        </div>
      </MiniCard>
    </Frame>
  );
}

function ArtImportar() {
  return (
    <Frame>
      <div className="flex items-center gap-2">
        <MiniCard className="w-24 space-y-2">
          <p className="text-muted-foreground text-[9px] leading-none font-medium">
            Mi lista base
          </p>
          <ListRows compact />
        </MiniCard>

        <ArrowRight className="text-primary size-5 shrink-0" aria-hidden />

        <MiniCard className="ring-primary/40 w-24 space-y-2">
          <p className="flex items-center gap-1 text-[9px] leading-none font-medium">
            <span aria-hidden>🎁</span> Oficina
          </p>
          <ListRows compact />
        </MiniCard>
      </div>
    </Frame>
  );
}

function ArtSorteo() {
  return (
    <Frame>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {/* La aguja, igual que en la ruleta de verdad. */}
          <span
            className="bg-foreground absolute -top-1 left-1/2 z-10 size-2.5 -translate-x-1/2"
            style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
            aria-hidden
          />
          {/* Seis gajos y tres colores: así ninguno queda al lado de su gemelo. */}
          <div
            className="ring-card size-20 rounded-full shadow-sm ring-4"
            style={{
              background:
                "conic-gradient(var(--endulzada) 0 60deg, var(--regalo) 0 120deg, var(--primary) 0 180deg, var(--endulzada) 0 240deg, var(--regalo) 0 300deg, var(--primary) 0 360deg)",
            }}
            aria-hidden
          />
          <span
            className="bg-card absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm"
            aria-hidden
          />
        </div>

        <ArrowRight
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden
        />

        <MiniCard className="w-28 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="bg-primary/25 size-6 rounded-full" aria-hidden />
            <Bar className="w-12" />
          </div>
          <ListRows compact />
        </MiniCard>
      </div>
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */
/* Los pasos                                                                  */
/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    title: "Arma tu lista una sola vez",
    art: ArtListaBase,
    body: (
      <>
        En <strong>Mi perfil</strong> guardas lo que te gusta: las{" "}
        <strong>endulzadas</strong> del día a día, el <strong>regalo</strong>{" "}
        grande del final y lo <strong>vetado</strong> — lo que prefieres{" "}
        <em>no</em> recibir. Es privada: nadie la ve hasta que la lleves a un
        grupo.
      </>
    ),
  },
  {
    title: "Entra a un grupo",
    art: ArtGrupo,
    body: (
      <>
        Crea uno y reparte el enlace, o abre el que te pasaron. Cada quien se
        agrega solo — nadie tiene que andar escribiendo nombres.
      </>
    ),
  },
  {
    title: "Llévala al grupo de un toque",
    art: ArtImportar,
    body: (
      <>
        Ya adentro, <strong>Importar mi lista base</strong> copia todo lo del
        perfil a ese grupo. Una sola lista te sirve para todos. Y ahí la
        ajustas para ese grupo sin tocar la original.
      </>
    ),
  },
  {
    title: "Sale el sorteo",
    art: ArtSorteo,
    body: (
      <>
        Cuando el admin sortea, giras la ruleta y descubres a quién te tocó.
        Verás su lista y sus vetados, así que ya sabes qué comprarle — y nadie
        más ve lo que te salió.
      </>
    ),
  },
];

/* -------------------------------------------------------------------------- */
/* El recorrido                                                               */
/* -------------------------------------------------------------------------- */

function Tour({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const { title, body, art: Art } = STEPS[step];

  return (
    <div className="space-y-3">
      <Art />

      <div className="space-y-1">
        <h3 className="font-heading text-base font-bold">{title}</h3>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Los puntos también son atajos: quien quiera volver a un paso no
            tiene que devolverse uno por uno. */}
        <div className="flex flex-1 items-center gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Paso ${i + 1}: ${s.title}`}
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "bg-primary w-5" : "bg-foreground/20 w-1.5",
              )}
            />
          ))}
        </div>

        {step > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            Atrás
          </Button>
        )}

        {isLast ? (
          <Button size="sm" onClick={onFinish}>
            <Check className="size-3.5" aria-hidden />
            Entendido
          </Button>
        ) : (
          <Button size="sm" onClick={() => setStep((s) => s + 1)}>
            Siguiente
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>

      {isLast && (
        <ButtonLink href="/perfil" variant="outline" className="w-full">
          <Sparkles className="size-4" aria-hidden />
          Empezar por mi lista base
        </ButtonLink>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Las dos formas de mostrarlo                                                */
/* -------------------------------------------------------------------------- */

/**
 * La tarjeta que recibe a una cuenta recién creada.
 *
 * Quien la monta ya decidió que la cuenta está vacía (sin grupos y sin lista
 * base), así que el caso normal es mostrarla: por eso el HTML del servidor ya
 * la trae y solo se esconde si el navegador dice que ya la cerraron. Al revés
 * habría un parpadeo justo en la pantalla de bienvenida, la peor donde
 * tenerlo.
 *
 * Una vez cerrada deja en su lugar `whenDismissed` — el vacío de siempre — en
 * vez de dejar la pantalla en blanco.
 */
export function OnboardingCard({
  whenDismissed,
}: {
  whenDismissed?: ReactNode;
}) {
  const yaLoVio = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (yaLoVio) return <>{whenDismissed}</>;

  return (
    <Card className="border-primary/20 relative mx-auto max-w-md p-4">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={marcarVisto}
        aria-label="Cerrar el tutorial"
        className="text-muted-foreground absolute top-2 right-2 z-10"
      >
        <X className="size-4" aria-hidden />
      </Button>

      <p className="text-primary text-xs font-semibold tracking-wide uppercase">
        Bienvenido
      </p>

      <Tour onFinish={marcarVisto} />
    </Card>
  );
}

/** El mismo recorrido, a la mano para quien ya cerró la tarjeta. */
export function HowItWorksButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            ¿Cómo funciona EndulzApp?
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cómo funciona?</DialogTitle>
        </DialogHeader>

        <Tour onFinish={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
