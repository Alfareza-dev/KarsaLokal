"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

interface AdminMobileHeaderProps {
  storeName: string;
  brandEmoji: string;
  themeColor: string;
}

/**
 * Client Component yang mengelola state sidebar mobile.
 * Merender Sidebar-nya sendiri (untuk mobile overlay),
 * dan header bar dengan tombol hamburger.
 *
 * Pada desktop, Sidebar yang ada di AdminLayout (Server Component)
 * yang akan tampil — komponen ini hidden via CSS di breakpoint lg+.
 */
export function AdminMobileHeader({ storeName, brandEmoji, themeColor }: AdminMobileHeaderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {/* Sidebar mobile — hanya terlihat/aktif saat isSidebarOpen */}
      <AdminSidebar
        branding={{ storeName, brandEmoji, themeColor }}
        isMobileControlled
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Mobile Header Bar */}
      <header className="lg:hidden h-16 bg-zinc-50 border-b border-zinc-200 flex items-center px-4 sticky top-0 z-30">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -ml-2 rounded-xl text-zinc-500 hover:bg-white hover:text-zinc-950 transition-colors"
        >
          <Menu size={24} />
        </button>
        <span className="ml-2 font-bold text-zinc-950">{storeName} Admin</span>
      </header>
    </>
  );
}
