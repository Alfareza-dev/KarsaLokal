"use client";

import { useState } from "react";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      // Check if email exists via custom profiles table
      const checkRes = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();

      if (!checkData.exists) {
        setErrorMsg("Email tidak terdaftar, silakan cek kembali atau daftar akun baru. ");
        setIsLoading(false);
        return;
      }

      // Send OTP for password reset via resend-otp endpoint
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset-password" }),
      });
      const data = await res.json();

      if (!res.ok && res.status !== 429) {
        toast.error(data.error || "Terjadi kesalahan.");
        setIsLoading(false);
        return;
      }

      if (res.status === 429) {
        toast.error(data.error || "Tunggu sebelum mengirim ulang.");
        setIsLoading(false);
        return;
      }

      toast.success("Kode OTP dikirim ke email kamu ");
      // Redirect to update-password page with email
      window.location.href = `/auth/update-password?email=${encodeURIComponent(email)}`;
    } catch {
      toast.error("Terjadi kesalahan.");
      setIsLoading(false);
    }
  };

  const inputCls = "w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-300 transition-all text-zinc-950";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-white opacity-10 blur-[80px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white opacity-8 blur-[100px]" />
      </div>
      <div className="w-full max-w-md relative z-10 flex flex-col gap-4">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-950 transition-colors w-fit group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />Kembali ke Login
        </Link>
        <div className="bg-zinc-50 backdrop-blur-xl rounded-[32px] p-8 shadow-none border border-zinc-200">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white text-zinc-950 rounded-full flex items-center justify-center mb-4 shadow-none">
              <KeyRound size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Lupa Password? </h1>
            <p className="text-sm text-zinc-500 mt-1 text-center">Masukkan email kamu dan kami akan kirim instruksi reset</p>
          </div>

          {isSent ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl"></span>
              </div>
              <h2 className="text-lg font-bold text-zinc-950 mb-2">Email Terkirim!</h2>
              <p className="text-sm text-zinc-500 mb-6">Cek inbox <span className="font-semibold text-zinc-950">{email}</span> untuk instruksi reset password.</p>
              <Link href="/auth/login" className="text-zinc-950 font-semibold text-sm hover:text-zinc-600 transition-colors">← Kembali ke Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errorMsg && (
                <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 text-center animate-fade-in">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500"><Mail size={18}/></div>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="yourmail@email.com" className={inputCls}/>
                </div>
              </div>
              <button type="submit" disabled={!email || isLoading} className="w-full bg-zinc-50 hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed text-zinc-950 font-bold py-3.5 rounded-2xl shadow-none transition-all transform hover:-translate-y-0.5 disabled:hover:translate-y-0 flex justify-center items-center h-[52px]">
                {isLoading ? (<><div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin mr-2"/>Memeriksa...</>) : "Kirim Instruksi Reset "}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
