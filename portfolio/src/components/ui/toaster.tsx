"use client";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

export function Toaster() {
  const { toast } = useToast();

  if (!toast) return null;

  return (
    <Toast
      message={toast.message}
      variant={toast.variant as any}
      className="animate-in fade-in duration-300"
    />
  );
}
