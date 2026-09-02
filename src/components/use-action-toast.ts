"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/actions/types";

/**
 * Surface a Server Action's result as a toast, exactly once per result.
 * `onSuccess` runs on the same tick — handy for closing a dialog or clearing
 * a form.
 */
export function useActionToast(state: ActionState, onSuccess?: () => void) {
  const seen = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state === seen.current || !state.message) return;
    seen.current = state;

    if (state.ok) {
      toast.success(state.message);
      onSuccess?.();
    } else {
      toast.error(state.message);
    }
    // `onSuccess` is intentionally left out: callers pass inline closures and
    // re-running on identity change would double-fire the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
