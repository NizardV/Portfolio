"use client";

import * as React from "react";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

// Defining the possible variants for the toast
type ToastVariant = "success" | "error" | "default";

export function Toaster() {

  const { toast } = useToast();

  // If there's no toast, we don't need to render anything
  if (!toast) return null;

  // Normalize the variant (avoids type errors)
  const variant: ToastVariant =
    toast.variant === "success" || toast.variant === "error" ? toast.variant : "default";

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <Toast
        message={toast.message}
        variant={variant}
        className="animate-in fade-in duration-300"
      />
    </div>
  );
}
