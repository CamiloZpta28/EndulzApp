import { PersonAvatar } from "@/components/person-avatar";
import type { MemberChip } from "@/lib/types";

/**
 * Las caritas del parche, montadas una sobre otra.
 *
 * `my_groups()` trae hasta 6; el resto se resume en un "+N" con el total real,
 * así una tarjeta de un parche de 30 personas sigue midiendo lo mismo.
 */
export function AvatarStack({
  members,
  total,
  max = 5,
}: {
  members: MemberChip[] | null | undefined;
  total: number;
  max?: number;
}) {
  // Tolera `undefined` a propósito: si el código va adelante de la migración,
  // `my_groups()` todavía no devuelve `members` y es mejor una tarjeta sin
  // caritas que una pantalla de error.
  const shown = (members ?? []).slice(0, max);
  const rest = Math.max(0, (total ?? shown.length) - shown.length);

  return (
    <div className="flex items-center">
      {shown.map((member, index) => (
        <PersonAvatar
          key={`${member.name}-${index}`}
          name={member.name}
          src={member.avatar_url}
          size="sm"
          className="ring-card -ml-2 ring-2 first:ml-0"
        />
      ))}

      {rest > 0 && (
        <span className="bg-muted text-muted-foreground ring-card -ml-2 flex size-8 items-center justify-center rounded-full text-xs font-semibold ring-2">
          +{rest}
        </span>
      )}

      {shown.length === 0 && (
        <span className="text-muted-foreground text-xs">Nadie todavía</span>
      )}
    </div>
  );
}
