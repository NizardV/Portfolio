"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast } from "@/components/ui/toast";

type ToastData = { message: string; variant?: "default" | "success" | "error" };

const ToastContext = createContext<{
  toast: (opts: ToastData) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastData, setToastData] = useState<ToastData | null>(null);

  const toast = useCallback((opts: ToastData) => {
    setToastData(opts);
    setTimeout(() => setToastData(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toastData && (
        <Toast
          message={toastData.message}
          variant={toastData.variant}
          className="animate-in fade-in duration-300"
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
