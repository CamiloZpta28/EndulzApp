import { redirect } from "next/navigation";
import { Candy, Gift, Link2, Shuffle } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { Logo } from "@/components/logo";
import { Shell } from "@/components/shell";
import { getUser } from "@/lib/db";

const STEPS = [
  {
    icon: Link2,
    title: "Reparte un enlace",
    body: "Uno solo, para todo el grupo. Cada quien entra, confirma y queda en la lista. No tienes que escribir a nadie a mano.",
    color: "var(--primary)",
  },
  {
    icon: Candy,
    title: "Pon los dos topes",
    body: "Uno para la endulzada — los dulcecitos del mes — y otro para el regalo grande. Todos los ven, nadie pregunta.",
    color: "var(--endulzada)",
  },
  {
    icon: Shuffle,
    title: "Sortea sin trampas",
    body: "El sorteo corre en el servidor, en un solo ciclo cerrado. Nadie se saca a sí mismo y ni el admin puede ver quién le salió a quién.",
    color: "var(--regalo)",
  },
];

export default async function Home() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex-1">
      {/* ---------------------------------------------------------- encabezado */}
      <section className="relative isolate overflow-hidden">
        {/* Caramelos desenfocados: dan el color de marca sin pedir imágenes. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div
            className="absolute -top-24 -left-20 size-72 rounded-full opacity-25 blur-3xl"
            style={{ background: "var(--primary)" }}
          />
          <div
            className="absolute -top-10 right-[-15%] size-80 rounded-full opacity-25 blur-3xl"
            style={{ background: "var(--endulzada)" }}
          />
          <div
            className="absolute bottom-[-30%] left-1/3 size-72 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--regalo)" }}
          />
        </div>

        <Shell width="wide" className="py-14 md:py-24">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <div className="flex justify-center">
              <Logo className="text-primary" markClassName="size-10" />
            </div>

            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight md:text-6xl">
              El amigo secreto del grupo,{" "}
              <span className="relative inline-block">
                <span className="relative z-10">bien organizado</span>
                {/* Subrayado a mano alzada, no un rectángulo. */}
                <svg
                  aria-hidden
                  viewBox="0 0 300 16"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-3 w-full"
                >
                  <path
                    d="M2 11c60-7 130-9 296-5"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    opacity="0.35"
                  />
                </svg>
              </span>
              .
            </h1>

            <p className="text-muted-foreground mx-auto max-w-xl text-lg">
              Un enlace para invitar, dos presupuestos, listas de antojos y un
              sorteo que nadie puede espiar. Desde el celular.
            </p>

            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <ButtonLink href="/login?mode=signup" size="lg" className="sm:px-8">
                <Gift className="size-4" aria-hidden />
                Crear mi grupo
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" size="lg" className="sm:px-8">
                Ya tengo cuenta
              </ButtonLink>
            </div>
          </div>
        </Shell>
      </section>

      {/* ------------------------------------------------------------- pasos */}
      <Shell width="wide" className="pb-20">
        <ul className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body, color }) => (
            <li
              key={title}
              className="bg-card space-y-3 rounded-2xl border p-5 md:p-6"
            >
              <span
                className="flex size-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in oklch, ${color}, transparent 88%)` }}
              >
                <Icon className="size-5" style={{ color }} aria-hidden />
              </span>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-muted-foreground text-sm">{body}</p>
            </li>
          ))}
        </ul>
      </Shell>
    </main>
  );
}
