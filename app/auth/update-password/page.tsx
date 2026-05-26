"use client";

import { Suspense } from "react";
import UpdatePasswordContent from "./UpdatePasswordContent";

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-5 h-5 border-2 border-zinc-200 border-t-[var(--theme-primary,#F472B6)] rounded-full animate-spin" />
        </div>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  );
}
