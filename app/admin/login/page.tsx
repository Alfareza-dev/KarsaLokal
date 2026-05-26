"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginPage() {
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
        setErrorMsg(data.error || "Login gagal.");
        return;
      }

      // Check if user is admin
      if (data.user?.role !== "admin") {
        setIsLoading(false);
        setErrorMsg("Akses ditolak. Akun ini bukan admin.");
        // Logout since we set a cookie for non-admin
        await fetch("/api/auth/logout", { method: "POST" });
        return;
      }

      toast.success("Login admin berhasil! ️");
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setIsLoading(false);
      setErrorMsg("Terjadi kesalahan sistem.");
    }
  };

  const inputCls = "w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-300 transition-all text-zinc-950";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-white opacity-10 blur-[80px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white opacity-8 blur-[100px]" />
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="bg-zinc-50 backdrop-blur-xl rounded-[32px] p-8 shadow-none border border-zinc-200">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white text-zinc-950 rounded-full flex items-center justify-center mb-4 shadow-none">
              <Shield size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Admin Panel ️</h1>
            <p className="text-sm text-zinc-500 mt-1">Masuk ke dashboard admin</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {errorMsg && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 text-center animate-fade-in">{errorMsg}</div>}
            <div>
              <label className="block text-sm font-semibold text-zinc-950 mb-2">Email Admin</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500"><Mail size={18}/></div>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@email.com" className={inputCls}/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-950 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500"><Lock size={18}/></div>
                <input type={showPassword?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password admin" className="w-full pl-11 pr-12 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-300 transition-all text-zinc-950"/>
                <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-gray-600 transition-colors">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
              </div>
            </div>
            <button type="submit" disabled={!email||!password||isLoading} className="w-full bg-zinc-50 hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed text-zinc-950 font-bold py-3.5 rounded-2xl shadow-none transition-all transform hover:-translate-y-0.5 disabled:hover:translate-y-0 flex justify-center items-center h-[52px]">
              {isLoading?(<><div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin mr-2"/>Masuk...</>):"Masuk Admin "}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
