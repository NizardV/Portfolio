import * as React from "react";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={twMerge(
        "flex h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder-white/40 outline-none ring-0 focus:border-white/30",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
