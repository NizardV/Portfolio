"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl text-sm transition-all duration-200 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 " +
    "disabled:pointer-events-none disabled:opacity-60 select-none",
  {
    variants: {
      variant: {
        // --- Bouton principal : dégradé violet → cyan ---
        default:
          "bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-md " +
          "hover:from-fuchsia-500 hover:to-cyan-400",

        // --- Secondaire : fond transparent / léger survol ---
        secondary:
          "bg-white/10 text-white border border-white/10 shadow-sm " +
          "hover:bg-white/20 hover:border-white/20",

        // --- Outline : bord simple translucide ---
        outline:
          "border border-white/20 text-white/90 hover:border-white/40 hover:bg-white/[0.06]",

        // --- Ghost : texte seul (utile dans footer, etc.) ---
        ghost: "text-white/70 hover:text-white hover:bg-white/5",
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs rounded-lg",
        lg: "h-11 px-6 text-base rounded-xl",
        icon: "h-10 w-10 p-0 rounded-lg",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
