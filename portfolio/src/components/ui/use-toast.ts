import { useState, useCallback } from "react";

export function useToast() {
  const [toast, setToast] = useState<{ message: string; variant?: string } | null>(null);

  const showToast = useCallback(
    (opts: { message: string; variant?: string }) => {
      setToast(opts);
      setTimeout(() => setToast(null), 3500);
    },
    []
  );

  return { toast, showToast };
}
