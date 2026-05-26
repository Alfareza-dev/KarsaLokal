"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, ArrowLeft, UserPlus, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (password.length < 6) { setErrorMsg("Password minimal 6 karakter"); return; }
    if (password !== confirmPassword) { setErrorMsg("Konfirmasi password tidak cocok"); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          whatsapp_number: whatsapp,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setIsLoading(false);
        setErrorMsg(data.error || "Terjadi kesalahan.");
        return;
      }

      toast.success(data.message || "Akun berhasil dibuat! Cek email kamu ");
      router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
    } catch {
      setIsLoading(false);
      setErrorMsg("Terjadi kesalahan sistem.");
    }
  };

  const inputCls = "w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-300 transition-all text-zinc-950";
  const iconCls = "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full bg-white opacity-10 blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-15%] w-[50%] h-[50%] rounded-full bg-white opacity-8 blur-[100px]" />
      </div>
      <div className="w-full max-w-md relative z-10 flex flex-col gap-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-950 transition-colors w-fit group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />Kembali ke Toko
        </Link>
        <div className="bg-zinc-50 backdrop-blur-xl rounded-[32px] p-8 shadow-none border border-zinc-200">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white text-zinc-950 rounded-full flex items-center justify-center mb-4 shadow-none">
              <UserPlus size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Buat Akun Baru </h1>
            <p className="text-sm text-zinc-500 mt-1">Daftar untuk mulai belanja produk digital</p>
          </div>
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {errorMsg && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 text-center animate-fade-in">{errorMsg}</div>}
            <div><label className="block text-sm font-semibold text-zinc-950 mb-2">Nama</label><div className="relative"><div className={iconCls}><User size={18}/></div><input type="text" required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nama" className={inputCls}/></div></div>
            <div><label className="block text-sm font-semibold text-zinc-950 mb-2">Nomor WhatsApp</label><div className="relative"><div className={iconCls}><Phone size={18}/></div><input type="tel" required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="08xxxxxxxxxx" className={inputCls}/></div></div>
            <div><label className="block text-sm font-semibold text-zinc-950 mb-2">Email</label><div className="relative"><div className={iconCls}><Mail size={18}/></div><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="yourmail@email.com" className={inputCls}/></div></div>
            <div><label className="block text-sm font-semibold text-zinc-950 mb-2">Password</label><div className="relative"><div className={iconCls}><Lock size={18}/></div><input type={showPassword?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter" className="w-full pl-11 pr-12 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-300 transition-all text-zinc-950"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-gray-600 transition-colors">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
            <div><label className="block text-sm font-semibold text-zinc-950 mb-2">Konfirmasi Password</label><div className="relative"><div className={iconCls}><Lock size={18}/></div><input type={showPassword?"text":"password"} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Ulangi password" className={inputCls}/></div>{confirmPassword&&password!==confirmPassword&&<p className="text-xs text-red-400 mt-1 pl-1">Password tidak cocok</p>}</div>
            <button type="submit" disabled={!fullName||!email||!password||!confirmPassword||isLoading} className="w-full bg-zinc-50 hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed text-zinc-950 font-bold py-3.5 rounded-2xl shadow-none transition-all transform hover:-translate-y-0.5 disabled:hover:translate-y-0 mt-2 flex justify-center items-center h-[52px]">
              {isLoading?(<><div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin mr-2"/>Mendaftarkan...</>):"Daftar Sekarang "}
            </button>
          </form>
          <div className="text-center mt-6"><p className="text-sm text-zinc-500">Sudah punya akun? <Link href="/auth/login" className="text-zinc-950 hover:text-zinc-600 font-bold transition-colors">Masuk</Link></p></div>
        </div>
      </div>
    </div>
  );
}
