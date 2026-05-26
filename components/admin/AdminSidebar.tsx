"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Image as ImageIcon, 
  Zap, 
  Store,
  LogOut,
  ExternalLink,
  Users,
  Receipt,
  PackageCheck
} from "lucide-react";
import { motion } from "framer-motion";

import { clearBrandingCookie } from "@/app/actions";

const menuItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Produk", href: "/admin/products", icon: Package },
  { name: "Kategori", href: "/admin/categories", icon: Tags },
  { name: "Banner", href: "/admin/banners", icon: ImageIcon },
  { name: "Flash Sale", href: "/admin/flash-sale", icon: Zap },
  { name: "Transaksi", href: "/admin/transactions", icon: Receipt },
  { name: "Pengiriman", href: "/admin/shipping", icon: PackageCheck },
  { name: "Pengguna", href: "/admin/users", icon: Users },
  { name: "Info Toko", href: "/admin/store-config", icon: Store },
];

interface AdminSidebarProps {
  branding: {
    storeName: string;
    brandEmoji: string;
    themeColor: string;
  };
  // Props opsional untuk mode mobile controlled (dari AdminMobileHeader)
  isMobileControlled?: boolean;
  isOpen?: boolean;
  setIsOpen?: (v: boolean) => void;
}

export function AdminSidebar({
  branding,
  isMobileControlled = false,
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Gunakan external state jika dikontrol dari luar (mobile header)
  const isOpen = isMobileControlled ? (externalIsOpen ?? false) : internalIsOpen;
  const setIsOpen = isMobileControlled
    ? (externalSetIsOpen ?? setInternalIsOpen)
    : setInternalIsOpen;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      // Hapus branding cookie saat logout agar tidak tertinggal
      await clearBrandingCookie();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      window.location.href = "/admin/login";
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-white/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-zinc-50 border-r border-zinc-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-zinc-200">
            <h1 className="text-zinc-950 font-bold text-xl tracking-tight truncate">
              {/* Tidak ada default "Katalog Digital" — data dari server */}
              {branding.storeName} Admin
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
            {menuItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-white text-zinc-950-hover font-bold"
                      : "text-zinc-500 hover:bg-white/50 hover:text-zinc-950 font-medium"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-zinc-950" : ""} />
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 w-1 h-8 bg-white rounded-r-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Action */}
          <div className="p-4 border-t border-zinc-200 flex flex-col gap-2">
            {/* Lihat Toko */}
            <Link
              href="/"
              target="_blank"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-500 hover:bg-gray-50 font-medium transition-colors"
            >
              <ExternalLink size={20} />
              Lihat Toko
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <div className="w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
              ) : (
                <LogOut size={20} />
              )}
              {isLoggingOut ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
