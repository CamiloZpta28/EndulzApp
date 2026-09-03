import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Se pinta al instante mientras el servidor arma la página.
 *
 * Es lo que quita la sensación de que la app "no responde" al navegar: sin
 * esto Next espera a tener el HTML listo antes de mostrar cualquier cosa, y
 * cada vuelta a este listado son varios viajes a Supabase.
 */
export default function DashboardLoading() {
  return (
    <>
      <div className="bg-primary h-[60px]" />
      <main className="flex-1 py-5">
        <Shell width="wide" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-card space-y-3 rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </Shell>
      </main>
    </>
  );
}
