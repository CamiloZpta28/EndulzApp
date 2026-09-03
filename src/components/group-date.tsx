import { cn } from "@/lib/utils";
import { formatGroupDate } from "@/lib/format";

/**
 * Una fecha del grupo: lo relativo arriba y lo exacto al lado.
 *
 * Las dos juntas porque cada una responde algo distinto: "en 8 días" dice si
 * hay que correr, "12 de sep" es lo que uno anota en el calendario.
 */
export function GroupDate({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  const parsed = formatGroupDate(value);
  if (!parsed) return null;

  const { relative, absolute, days } = parsed;

  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span
        className={cn(
          "font-medium tabular-nums",
          days < 0 && "text-muted-foreground line-through",
        )}
      >
        {absolute}
      </span>
      {relative && (
        <span className="text-muted-foreground text-[0.9em]">
          ({relative})
        </span>
      )}
    </span>
  );
}
