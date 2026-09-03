import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <>
      <div className="bg-primary h-[60px]" />
      <main className="flex-1 py-5">
        <Shell className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-16 md:col-span-2" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </Shell>
      </main>
    </>
  );
}
