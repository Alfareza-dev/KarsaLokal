import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[20%] w-[40%] h-[40%] rounded-full bg-white opacity-10 blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[45%] h-[45%] rounded-full bg-white opacity-8 blur-[100px]" />
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="bg-zinc-50 backdrop-blur-xl rounded-[32px] p-8 shadow-none border border-zinc-200 text-center">
          <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center mb-6 shadow-none">
            <ShieldCheck size={40} className="text-zinc-950" />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 mb-3">Cek Email Kamu! </h1>
          <p className="text-zinc-500 text-sm mb-2">Kami sudah mengirim kode OTP 6 digit ke email kamu.</p>
          <p className="text-zinc-500 text-sm mb-6">Masukkan kode tersebut di halaman verifikasi untuk mengaktifkan akun.</p>
          <div className="bg-white rounded-2xl p-4 mb-6">
            <p className="text-xs text-zinc-500"> <span className="font-semibold">Tips:</span> Cek juga folder <span className="font-semibold">Spam</span> atau <span className="font-semibold">Promosi</span> jika tidak menemukan emailnya.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/auth/login" className="w-full bg-gradient-to-r from-zinc-800 to-zinc-700 text-white font-bold py-3 rounded-2xl shadow-none transition-all hover:opacity-90 hover:-translate-y-0.5 text-center">
              Ke Halaman Login
            </Link>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-950 transition-colors font-medium">
              ← Kembali ke Toko
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
