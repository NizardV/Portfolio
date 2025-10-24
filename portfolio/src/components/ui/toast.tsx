"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "fixed bottom-5 right-5 z-50 flex items-center justify-between space-x-4 rounded-md border p-4 shadow-xl backdrop-blur-sm transition-all",
  {
    variants: {
      variant: {
        default: "bg-gray-800 text-white border-gray-700",
        success: "bg-green-600 text-white border-green-700",
        error: "bg-red-600 text-white border-red-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  message: string;
}

export function Toast({ message, variant, className, ...props }: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        toastVariants({ variant }),
        isVisible ? "toast-enter" : "toast-exit",
        className
      )}
      {...props}
    >
      {message}
    </div>
  );
}
