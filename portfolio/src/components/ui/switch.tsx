import * as React from "react";
import { twMerge } from "tailwind-merge";

type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
};

export function Switch({ checked = false, onCheckedChange, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={twMerge(
        "inline-flex h-6 w-10 items-center rounded-full transition-colors",
        checked ? "bg-white" : "bg-white/20",
        className
      )}
    >
      <span
        className={twMerge(
          "h-5 w-5 rounded-full bg-black transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
