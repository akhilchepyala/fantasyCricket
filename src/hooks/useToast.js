// src/hooks/useToast.js
import { useState, useRef, useCallback } from "react";

export function useToast() {
  const [toast, setToast] = useState({ msg: "", type: "ok", show: false });
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = "ok") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, type, show: true });
    timerRef.current = setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      3200
    );
  }, []);

  return [toast, showToast];
}
