"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => { if (!email) router.push("/auth/forgot-password"); }, [email, router]);

  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const n = [...otp]; n[i] = v.slice(-1); setOtp(n);
    if (v && i < 5) inputRefs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p.length === 6) { setOtp(p.split("")); inputRefs.current[5]?.focus(); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { setErrorMsg("Masukkan 6 digit kode OTP."); return; }
    if (password.length < 6) { setErrorMsg("Password minimal 6 karakter"); return; }
    if (password !== confirmPassword) { setErrorMsg("Konfirmasi password tidak cocok"); return; }

    setErrorMsg(""); setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        setErrorMsg(data.error || "Gagal mengubah password.");
        return;
      }
      toast.success(data.message || "Password berhasil diubah! ");
      router.push("/auth/login");
    } catch {
      setIsLoading(false);
      setErrorMsg("Terjadi kesalahan sistem.");
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true); setErrorMsg("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset-password" }),
      });
      const data = await res.json();
      if (res.status === 429) { setCooldown(data.cooldown || 60); toast.error(data.error); }
      else if (!res.ok) { toast.error(data.error || "Gagal mengirim ulang OTP."); }
      else { toast.success("OTP baru dikirim!"); setCooldown(60); setOtp(["","","","","",""]); inputRefs.current[0]?.focus(); }
    } catch { toast.error("Terjadi kesalahan."); }
    setIsResending(false);
  };

  if (!email) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-white opacity-10 blur-[80px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white opacity-8 blur-[100px]" />
      </div>
      <div className="w-full max-w-md relative z-10 flex flex-col gap-4">
        <Link href="/auth/forgot-password" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-950 transition-colors w-fit group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />Kembali
        </Link>
        <div className="bg-zinc-50 backdrop-blur-xl rounded-[32px] p-8 shadow-none border border-zinc-200">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white text-zinc-950 rounded-full flex items-center justify-center mb-4 shadow-none">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Password Baru </h1>
            <p className="text-sm text-zinc-500 mt-2 text-center">Masukkan kode OTP dan password baru</p>
            <p className="text-sm font-bold text-zinc-950 mt-1">{email}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {errorMsg && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 text-center">{errorMsg}</div>}

            {/* OTP Input */}
            <div>
              <label className="block text-sm font-semibold text-zinc-950 mb-2">Kode OTP</label>
              <div className="flex justify-center gap-3" onPaste={handlePaste}>
                {otp.map((d, i) => (
                  <input key={i} ref={el => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-2xl font-extrabold rounded-2xl border-2 bg-white transition-all outline-none ${d ? "border-zinc-200 bg-white text-zinc-950" : "border-zinc-200 text-zinc-950"} focus:border-zinc-300 focus:ring-2 focus:ring-zinc-600`} />
                ))}
              </div>
              <div className="text-center mt-3">
                <button type="button" onClick={handleResend} disabled={cooldown > 0 || isResending}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${cooldown > 0 ? "text-zinc-500 cursor-not-allowed" : "text-zinc-950 hover:text-zinc-600 cursor-pointer"}`}>
                  <RefreshCw size={12} className={isResending ? "animate-spin" : ""} />
                  {cooldown > 0 ? `Kirim ulang ${cooldown}s` : isResending ? "Mengirim..." : "Kirim Ulang OTP"}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-zinc-950 mb-2">Password Baru</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500"><Lock size={18}/></div>
                <input type={showPassword?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter" className="w-full pl-11 pr-12 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-300 transition-all text-zinc-950"/>
                <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-gray-600 transition-colors">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-zinc-950 mb-2">Konfirmasi Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500"><Lock size={18}/></div>
                <input type={showPassword?"text":"password"} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-300 transition-all text-zinc-950"/>
              </div>
              {confirmPassword&&password!==confirmPassword&&<p className="text-xs text-red-400 mt-1 pl-1">Password tidak cocok</p>}
            </div>

            <button type="submit" disabled={otp.join("").length !== 6 || !password || !confirmPassword || isLoading}
              className="w-full bg-zinc-50 hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed text-zinc-950 font-bold py-3.5 rounded-2xl shadow-none transition-all transform hover:-translate-y-0.5 disabled:hover:translate-y-0 flex justify-center items-center h-[52px]">
              {isLoading?(<><div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin mr-2"/>Menyimpan...</>):"Simpan Password Baru "}
            </button>
          </form>

          <div className="bg-white rounded-2xl p-4 mt-6">
            <p className="text-xs text-zinc-500 text-center"> Cek folder <span className="font-semibold">Spam</span> jika belum menerima kode OTP</p>
          </div>
        </div>
      </div>
    </div>
  );
}
