import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStoreConfig } from "@/lib/store";
import { Header } from "@/components/public/Header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const config = await getStoreConfig();

  return (
    <div className="w-full max-w-[480px] md:max-w-[1200px] mx-auto min-h-screen flex flex-col relative">
      {/* Header — tampilkan avatar user karena sudah pasti login */}
      <Header
        storeName={config.name}
        userName={user.full_name}
        isLoggedIn={true}
      />

      {/* Kembali ke Toko button */}
      <div className="px-4 pb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-950 transition-colors group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
          Kembali ke Toko
        </Link>
      </div>

      <main className="flex-1 px-4 pb-8">{children}</main>
    </div>
  );
}
