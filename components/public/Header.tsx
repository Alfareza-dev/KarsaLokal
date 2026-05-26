"use client";

import Link from "next/link";
import { UserCircle } from "lucide-react";
import { useState, useEffect } from "react";

type HeaderProps = {
  storeName: string;
  userName?: string | null;
  isLoggedIn?: boolean;
};

export function Header({ storeName, userName, isLoggedIn }: HeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="px-4 pt-4 pb-3 animate-fade-in flex items-center justify-between">
      <Link href="/">
        <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
          {storeName}
        </h1>
      </Link>

      {/* User identity / Login link */}
      <div className="flex items-center gap-2">
        {mounted && (
          isLoggedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-950 transition-colors bg-zinc-50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-zinc-200 hover:border-zinc-200 shadow-none"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="max-w-[100px] truncate hidden sm:inline">
                {userName || "Dashboard"}
              </span>
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-2 text-sm font-medium text-black bg-white hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg shadow-sm"
            >
              <UserCircle size={18} />
              <span className="hidden sm:inline">Masuk</span>
            </Link>
          )
        )}
      </div>
    </header>
  );
}

