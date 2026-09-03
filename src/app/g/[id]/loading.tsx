import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroupLoading() {
  return (
    <>
      <div className="bg-primary h-[60px]" />
      <main className="flex-1 py-5">
        <Shell className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        </Shell>
      </main>
    </>
  );
}
