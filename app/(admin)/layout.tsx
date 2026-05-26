import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileHeader } from "@/components/admin/AdminMobileHeader";
import { getStoreConfig } from "@/lib/store";
import { getThemeConfig } from "@/lib/themes";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── ️ Server-Side Guard (Lapis Kedua) ────────────────────────────────────
  // Proxy sudah melindungi di layer pertama, tapi kita tambahkan
  // pengecekan server-side di layout sebagai defense-in-depth.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  if (user.role !== "admin") {
    // User terdaftar tapi bukan admin → tendang ke beranda
    redirect("/");
  }

  // ── Fetch branding server-side ─────────────────────────────────────────────
  const config = await getStoreConfig();
  const themeConfig = getThemeConfig(config.theme_color);

  const branding = {
    storeName: config.name,
    brandEmoji: config.brand_emoji,
    themeColor: config.theme_color,
  };

  return (
    <div
      className="min-h-screen bg-zinc-50 flex"
      style={{
        "--theme-primary": themeConfig.primary,
        "--theme-hover": themeConfig.hover,
        "--theme-bg-soft": themeConfig.bgSoft,
      } as React.CSSProperties}
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar branding={branding} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Mobile Header + Sidebar */}
        <AdminMobileHeader
          storeName={branding.storeName}
          brandEmoji={branding.brandEmoji}
          themeColor={branding.themeColor}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
