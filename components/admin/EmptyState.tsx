"use client";

import { motion } from "framer-motion";
import { SearchX } from "lucide-react";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  emoji = "",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Illustration */}
      <div className="mb-4">
        <SearchX className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
      </div>

      <p className="text-zinc-950 font-bold text-base mt-1">{title}</p>

      {description && (
        <p className="text-zinc-500 text-sm mt-1 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 text-sm font-bold px-5 py-2.5 rounded-xl shadow-none transition-all hover:scale-105 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
