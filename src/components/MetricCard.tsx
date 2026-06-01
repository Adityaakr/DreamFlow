"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/format";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "cyan" | "violet" | "green" | "pink" | "amber";
  icon?: LucideIcon;
};

const toneClasses = {
  neutral: "text-[var(--text-primary)]",
  cyan: "text-[var(--text-primary)]",
  violet: "text-[var(--accent-violet)]",
  green: "text-[var(--accent-green)]",
  pink: "text-[var(--accent-red)]",
  amber: "text-[var(--accent-orange)]",
};

export function MetricCard({ label, value, detail, tone = "neutral", icon: Icon }: MetricCardProps) {
  return (
    <motion.article
      layout
      className="bb-panel min-w-[170px] p-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="bb-label">
          {label}
        </p>
        {Icon ? <Icon className={cn("h-4 w-4", toneClasses[tone])} aria-hidden="true" /> : null}
      </div>
      <p className={cn("mt-2 font-mono text-2xl font-black tabular-nums", toneClasses[tone])}>{value}</p>
      {detail ? <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">{detail}</p> : null}
    </motion.article>
  );
}
