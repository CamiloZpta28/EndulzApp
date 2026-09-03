import { redirect } from "next/navigation";
import { Candy, Gift, Shuffle } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { getUser } from "@/lib/db";

const STEPS = [
  {
    icon: Candy,
    title: "Arma el parche",
    body: "Agrega a todos por nombre. Cada uno recibe un enlace para reclamar su puesto — no necesitan cuenta para que los agregues.",
  },
  {
    icon: Gift,
    title: "Pon los topes",
    body: "Un presupuesto para la endulzada (los dulcecitos del mes) y otro para el regalo grande. Todos los ven.",
  },
  {
    icon: Shuffle,
    title: "Sortea sin trampas",
    body: "El sorteo corre en el servidor. Nadie se saca a sí mismo y ni el admin puede ver quién le salió a quién.",
  },
];

export default async function Home() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 px-6 py-14">
      <header className="space-y-3">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">
          EndulzApp
        </p>
        <h1 className="text-4xl leading-tight font-bold tracking-tight">
          El amigo secreto del parche, bien organizado.
        </h1>
        <p className="text-muted-foreground text-base">
          Participantes, presupuestos, listas de antojos y el sorteo. Todo en un
          solo lugar y desde el celular.
        </p>
      </header>

      <ul className="space-y-5">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2 className="font-semibold">{title}</h2>
              <p className="text-muted-foreground text-sm">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <ButtonLink href="/login?mode=signup" size="lg" className="w-full">
          Crear mi grupo
        </ButtonLink>
        <ButtonLink href="/login" variant="outline" size="lg" className="w-full">
          Ya tengo cuenta
        </ButtonLink>
      </div>
    </main>
  );
}
