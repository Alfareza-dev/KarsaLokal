"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowLeft, LogIn, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setIsLoading(false);
        // If user needs verification, redirect to OTP page
        if (data.needVerification) {
          toast.info("Email belum diverifikasi. Silakan masukkan kode OTP.");
          router.push(`/auth/verify-otp?email=${encodeURIComponent(data.email)}`);
          return;
        }
        setErrorMsg(data.error || "Login gagal.");
        return;
      }

      toast.success("Login berhasil! ");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setIsLoading(false);
      setErrorMsg("Terjadi kesalahan sistem.");
    }
  };

  const inputCls = "w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:border-zinc-950 transition-all text-zinc-950";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-white opacity-10 blur-[80px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white opacity-8 blur-[100px]" />
      </div>
      <div className="w-full max-w-md relative z-10 flex flex-col gap-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-950 transition-colors w-fit group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />Kembali ke Toko
        </Link>
        <div className="bg-zinc-50 backdrop-blur-xl rounded-[32px] p-8 shadow-none border border-zinc-200">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white text-zinc-950 rounded-full flex items-center justify-center mb-4 shadow-none">
              <LogIn size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Welcome Back! </h1>
            <p className="text-sm text-zinc-500 mt-1">Masuk ke akun kamu</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {errorMsg && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 text-center animate-fade-in">{errorMsg}</div>}
            <div>
              <label className="block text-sm font-semibold text-zinc-950 mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500"><Mail size={18}/></div>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="yourmail@email.com" className={inputCls}/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-950 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500"><Lock size={18}/></div>
                <input type={showPassword?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full pl-11 pr-12 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:border-zinc-950 transition-all text-zinc-950"/>
                <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-600 transition-colors">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs font-semibold text-zinc-950 hover:text-zinc-600 transition-colors">Lupa Password?</Link>
            </div>
            <button type="submit" disabled={!email||!password||isLoading} className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl shadow-none transition-all transform hover:-translate-y-0.5 disabled:hover:translate-y-0 flex justify-center items-center h-[52px]">
              {isLoading?(<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/>Masuk...</>):"Masuk "}
            </button>
          </form>
          <div className="text-center mt-6"><p className="text-sm text-zinc-500">Belum punya akun? <Link href="/auth/register" className="text-zinc-950 hover:text-zinc-600 font-bold transition-colors">Daftar</Link></p></div>
        </div>
      </div>
    </div>
  );
}
