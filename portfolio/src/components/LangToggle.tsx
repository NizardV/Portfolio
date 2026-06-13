"use client";

import { motion } from "framer-motion";
import React from "react";

export type Lang = "fr" | "en";

interface LangToggleProps {
  lang: Lang;
  onChange: (lang: Lang) => void;
  className?: string;
}

export default function LangToggle({ lang, onChange, className = "" }: LangToggleProps) {
  const isFR = lang === "fr";

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") onChange("fr");
    if (e.key === "ArrowRight") onChange("en");
  };

  return (
    <div
      role="tablist"
      aria-label="Language selector"
      tabIndex={0}
      onKeyDown={onKey}
      className={
        "relative inline-flex items-center rounded-xl border border-white/15 bg-white/5 p-1 text-xs " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] select-none " +
        className
      }
    >
      {/* Fond animé */}
      <motion.div
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white/12"
        animate={{ left: isFR ? 4 : "calc(50% + 4px)" }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      />

      <button
        type="button"
        role="tab"
        aria-selected={isFR}
        onClick={() => onChange("fr")}
        className={
          "relative z-10 px-3 py-1.5 rounded-lg transition-colors " +
          (isFR ? "text-white" : "text-white/70 hover:text-white")
        }
      >
        FR
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={!isFR}
        onClick={() => onChange("en")}
        className={
          "relative z-10 px-3 py-1.5 rounded-lg transition-colors " +
          (!isFR ? "text-white" : "text-white/70 hover:text-white")
        }
      >
        EN
      </button>
    </div>
  );
}
