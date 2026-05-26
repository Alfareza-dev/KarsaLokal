import Link from "next/link";
import { getStoreConfig } from "@/lib/store";

export const metadata = {
  title: "Halaman Tidak Ditemukan",
};

export default async function NotFound() {
  const config = await getStoreConfig();

  const storeName = config.name;
  const brandEmoji = config.brand_emoji;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      {/* Sad Kawaii Emoji */}
      <div className="text-8xl mb-6 animate-bounce" style={{ animationDuration: "2s" }}>
        
      </div>

      {/* Title */}
      <h1 className="text-4xl font-extrabold text-zinc-950 mb-3 tracking-tight">
        Halaman Tidak Ditemukan
      </h1>

      {/* Description */}
      <p className="text-zinc-500 text-lg mb-2 max-w-md">
        Ups! Sepertinya halaman yang kamu cari sudah tidak ada atau pindah tempat...
      </p>
      <p className="text-zinc-500 text-sm mb-8">
        Tapi tenang, kamu bisa kembali ke beranda kapan saja! {brandEmoji}
      </p>

      {/* CTA Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-white hover:opacity-90 text-white font-bold px-8 py-4 rounded-2xl shadow-none transition-all hover:scale-105 text-base"
      >
        ← Kembali ke Beranda
      </Link>

      {/* Decorative */}
      <div className="mt-12 text-gray-300 text-sm">
        Error 404 • {storeName}
      </div>
    </div>
  );
}
