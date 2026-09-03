import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

/**
 * A link that looks like a button.
 *
 * Base UI's `Button` assumes a native `<button>` unless told otherwise, so
 * rendering it as an anchor without `nativeButton={false}` logs an
 * accessibility warning and drops button semantics. Wrapping it here means the
 * flag cannot be forgotten at a call site.
 */
export function ButtonLink({
  href,
  children,
  variant,
  size,
  className,
  ...linkProps
}: ComponentProps<typeof Link> &
  Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  return (
    <Button
      nativeButton={false}
      variant={variant}
      size={size}
      className={className}
      render={<Link href={href} {...linkProps} />}
    >
      {children}
    </Button>
  );
}
