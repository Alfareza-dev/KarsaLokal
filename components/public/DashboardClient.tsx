"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, ShoppingBag, LogOut, Save, Phone, Mail, Package,
  Clock, CheckCircle, XCircle, Lock, Eye, EyeOff, KeyRound, Crown, LayoutDashboard,
  Copy, ChevronRight, Ban, ShieldCheck, CheckCircle2, AlertTriangle, MapPin, Truck
} from "lucide-react";

import { toast } from "sonner";

type Order = {
  id: number;
  product_id: number | null;
  product_name: string | null;
  amount: number;
  status: "pending" | "settled" | "failed" | "cancelled";
  reference_id: string | null;
  payment_method: string | null;
  created_at: string;
  inventory_content?: string | null;
  shipping_status?: "pending" | "packing" | "shipped" | "delivered" | null;
  tracking_number?: string | null;
  shipping_method?: string | null;
  courier_name?: string | null;
};

type UserData = {
  id: string;
  email: string;
  full_name: string;
  whatsapp_number: string;
  role?: string;
};

const inputCls =
  "w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-200 transition-all text-zinc-950";
const iconCls =
  "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500";

export function DashboardClient({ user, orders, address }: { user: UserData; orders: Order[]; address?: any }) {
  const [activeTab, setActiveTab] = useState<"profil" | "pesanan">("profil");
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Berhasil logout ");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Gagal logout");
    }
  };

  const tabs = [
    { id: "profil" as const, label: "Profil", icon: User },
    { id: "pesanan" as const, label: "Pesanan", icon: ShoppingBag },
  ];

  return (
    <div className="animate-fade-in">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-950 flex items-center gap-2">
            {user.role === "admin" ? (
              <>
                <Crown size={20} className="text-yellow-500" />
                Hai, Admin! 
              </>
            ) : (
              <>Hai, {user.full_name || "User"}! </>
            )}
          </h1>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "admin" && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 text-sm font-semibold text-zinc-950 hover:opacity-80 transition-colors bg-white rounded-2xl px-4 py-2.5 border border-zinc-200"
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Panel Admin</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-500 transition-colors bg-zinc-50 rounded-2xl px-4 py-2.5 shadow-none border border-zinc-200 hover:border-red-200"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-zinc-800 to-zinc-700 text-white shadow-none"
                  : "bg-zinc-50 text-zinc-500 border border-zinc-200 hover:border-zinc-200 hover:text-zinc-950"
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.id === "pesanan" && orders.length > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-zinc-50"
                      : "bg-white text-zinc-950"
                  }`}
                >
                  {orders.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "profil" ? <ProfileTab user={user} address={address} /> : <OrdersTab orders={orders} />}
    </div>
  );
}

function ProfileTab({ user, address }: { user: UserData; address?: any }) {
  const [fullName, setFullName] = useState(user.full_name);
  const [whatsapp, setWhatsapp] = useState(user.whatsapp_number);
  const [isSaving, setIsSaving] = useState(false);

  // Change password states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("full_name", fullName);
      formData.set("whatsapp_number", whatsapp);
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, whatsapp_number: whatsapp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan profil");
      toast.success("Profil berhasil diperbarui! ");
      router.refresh();
    } catch (err) {
      console.error("[Dashboard Profile PATCH Error]:", err);
      toast.error("Gagal menyimpan profil. Coba lagi ya! ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPassword.length < 6) { setPwError("Password minimal 6 karakter"); return; }
    if (newPassword !== confirmPassword) { setPwError("Konfirmasi password tidak cocok"); return; }
    setIsChangingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah password");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password berhasil diubah! ");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah password";
      setPwError(msg);
      toast.error("Gagal mengubah password");
    } finally {
      setIsChangingPw(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Informasi Profil ── */}
      <div className="bg-zinc-50 rounded-[24px] p-6 shadow-none border border-zinc-200">
        <h2 className="text-lg font-bold text-zinc-950 mb-1">Informasi Profil</h2>
        <p className="text-sm text-zinc-500 mb-6">Perbarui data diri kamu di sini</p>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Email — read only */}
          <div>
            <label className="block text-sm font-semibold text-zinc-950 mb-2">Email</label>
            <div className="relative">
              <div className={iconCls}><Mail size={18}/></div>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm text-zinc-500 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1 pl-1">Email tidak bisa diubah</p>
          </div>

          {/* Full name */}
          <div>
            <label className="block text-sm font-semibold text-zinc-950 mb-2">Nama</label>
            <div className="relative">
              <div className={iconCls}><User size={18}/></div>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nama"
                className={inputCls}
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-semibold text-zinc-950 mb-2">Nomor WhatsApp</label>
            <div className="relative">
              <div className={iconCls}><Phone size={18}/></div>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto sm:self-end bg-zinc-950 hover:bg-zinc-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-2xl shadow-none transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</>
            ) : (
              <><Save size={16}/>Simpan Profil</>
            )}
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-zinc-200">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={18} className="text-zinc-950"/>
            <h3 className="text-sm font-bold text-zinc-950">Alamat Pengiriman</h3>
          </div>
          
          {address ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-zinc-950">{address.recipient_name} <span className="font-normal text-zinc-500 ml-2">{address.phone_number}</span></p>
              <p className="text-sm text-zinc-700 mt-2 leading-relaxed">{address.full_address}</p>
              {address.village_name && (
                <p className="text-sm font-medium text-zinc-500 mt-1">{address.village_name}</p>
              )}
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-4 text-center">
              <p className="text-sm text-zinc-500">Belum ada alamat pengiriman yang tersimpan.</p>
            </div>
          )}

          <Link
            href="/dashboard/address"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-zinc-200 text-zinc-950 font-bold py-2.5 px-6 rounded-xl hover:bg-zinc-50 transition-colors text-sm"
          >
            {address ? "Ubah Alamat" : "Tambah Alamat"}
          </Link>
        </div>
      </div>

      {/* ── Ganti Password ── */}
      <div className="bg-zinc-50 rounded-[24px] p-6 shadow-none border border-zinc-200">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={18} className="text-zinc-950"/>
          <h2 className="text-lg font-bold text-zinc-950">Ganti Password</h2>
        </div>
        <p className="text-sm text-zinc-500 mb-6">Buat password baru untuk akun kamu</p>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
          {pwError && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100">
              {pwError}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-zinc-950 mb-2">Password Baru</label>
            <div className="relative">
              <div className={iconCls}><Lock size={18}/></div>
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-11 pr-12 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-200 transition-all text-zinc-950"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-950 mb-2">Konfirmasi Password Baru</label>
            <div className="relative">
              <div className={iconCls}><Lock size={18}/></div>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className={inputCls}
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400 mt-1 pl-1">Password tidak cocok</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!newPassword || !confirmPassword || isChangingPw}
            className="w-full sm:w-auto sm:self-end bg-gray-800 hover:bg-gray-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-2xl transition-all transform hover:-translate-y-0.5 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {isChangingPw ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</>
            ) : (
              <><Lock size={16}/>Ganti Password</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Orders Tab ──────────────────────────────────────────── */
function OrdersTab({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState("");

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string; border: string; dot: string }> = {
    pending: { label: "Pending", icon: Clock, color: "text-zinc-500", bg: "bg-white", border: "border-zinc-200", dot: "bg-neutral-500" },
    settled: { label: "Berhasil", icon: CheckCircle2, color: "text-white", bg: "bg-white", border: "border-zinc-200", dot: "bg-zinc-50" },
    failed: { label: "Gagal", icon: AlertTriangle, color: "text-zinc-500", bg: "bg-white", border: "border-zinc-200", dot: "bg-neutral-600" },
    cancelled: { label: "Dibatalkan", icon: Ban, color: "text-zinc-500", bg: "bg-white", border: "border-zinc-200", dot: "bg-neutral-700" },
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Disalin!");
    setTimeout(() => setCopiedField(""), 2000);
  };

  const parseContent = (raw: string): { label: string; value: string }[] => {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        return Object.entries(parsed).map(([key, val]) => ({
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          value: String(val),
        }));
      }
    } catch { /* not JSON */ }
    const lines = raw.split("\n").filter(Boolean);
    return lines.map((line) => {
      const idx = line.indexOf(":");
      if (idx > 0) return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      return { label: "Info", value: line.trim() };
    });
  };

  if (orders.length === 0) {
    return (
      <div className="bg-zinc-50 rounded-[24px] p-8 shadow-none border border-zinc-200 text-center">
        <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center mb-4">
          <Package size={36} className="text-zinc-950" />
        </div>
        <h2 className="text-lg font-bold text-zinc-950 mb-2">Belum Ada Pesanan</h2>
        <p className="text-sm text-zinc-500 mb-4">Pesanan kamu akan muncul di sini setelah melakukan pembelian.</p>
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-950 hover:text-zinc-600 transition-colors">
          ️ Mulai Belanja
        </a>
      </div>
    );
  }

  return (
    <div className="bg-zinc-50 rounded-[24px] p-6 shadow-none border border-zinc-200">
      <h2 className="text-lg font-bold text-zinc-950 mb-1">Riwayat Pesanan</h2>
      <p className="text-sm text-zinc-500 mb-4">{orders.length} pesanan</p>
      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const sc = statusConfig[order.status] || statusConfig.pending;
          let displayLabel = sc.label;
          let displayColor = sc.color;
          let displayDot = sc.dot;

          if (order.status === "settled" && order.shipping_method === "delivery" && order.shipping_status) {
            const shipSc = {
              pending: { label: "Menunggu Diproses", color: "text-zinc-500", dot: "bg-zinc-500" },
              packing: { label: "Sedang Dikemas", color: "text-amber-600", dot: "bg-amber-500" },
              shipped: { label: "Dikirim", color: "text-blue-600", dot: "bg-blue-500" },
              delivered: { label: "Diterima", color: "text-emerald-600", dot: "bg-emerald-500" },
            }[order.shipping_status];
            if (shipSc) {
              displayLabel = shipSc.label;
              displayColor = shipSc.color;
              displayDot = shipSc.dot;
            }
          }

          const Icon = sc.icon;
          const date = new Date(order.created_at);
          const isPending = order.status === "pending";
          const isSettled = order.status === "settled";
          const isExpanded = expandedId === order.id;
          const canExpand = isPending || (isSettled && (order.inventory_content || order.shipping_method === "delivery"));

          return (
            <div key={order.id} className="flex flex-col">
              <button
                onClick={() => {
                  if (isPending) {
                    router.push(`/checkout/${order.id}`);
                  } else if (canExpand && !isPending) {
                    setExpandedId(isExpanded ? null : order.id);
                  }
                }}
                className={`group flex items-center justify-between p-4 rounded-2xl border ${sc.border} ${sc.bg} transition-all w-full text-left ${
                  canExpand ? "cursor-pointer hover:shadow-sm" : "cursor-default"
                } ${isExpanded ? "rounded-b-none" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sc.bg} shrink-0`}>
                    <Icon size={20} className={sc.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-950 truncate">{order.product_name || `Order #${order.id}`}</p>
                    <p className="text-xs text-zinc-500">{date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-950">Rp{order.amount.toLocaleString("id-ID")}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${displayColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${displayDot}`} />
                      {displayLabel}
                    </span>
                  </div>
                  {canExpand && (
                    <div className="hidden sm:flex items-center gap-1 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 shadow-none group-hover:border-zinc-200 transition-colors">
                      <span className={`text-xs font-bold ${isPending ? "text-zinc-950" : "text-zinc-500"}`}>
                        {isPending ? "Lanjutkan Pembayaran" : isExpanded ? "Tutup Detail" : "Lihat Detail"}
                      </span>
                      <ChevronRight size={16} className={`${isPending ? "text-zinc-950" : "text-zinc-500"} transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  )}
                  {canExpand && (
                    <div className="sm:hidden flex items-center">
                      <ChevronRight size={18} className={`text-zinc-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded: show product details for settled orders */}
              {isExpanded && isSettled && canExpand && (
                <div className="bg-zinc-50 border border-t-0 border-zinc-200 rounded-b-2xl p-4">
                  {order.shipping_method === "delivery" ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Truck size={14} className="text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-500">Informasi Pengiriman</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5 bg-white border border-zinc-200 p-4 rounded-md">
                          <span className="text-xs font-medium text-zinc-500 tracking-wider">Status Pengiriman</span>
                          <span className="text-sm font-bold text-zinc-950">{displayLabel}</span>
                        </div>
                        {order.courier_name && (
                          <div className="flex flex-col gap-1.5 bg-white border border-zinc-200 p-4 rounded-md">
                            <span className="text-xs font-medium text-zinc-500 tracking-wider">Kurir Pengiriman</span>
                            <span className="text-sm font-bold text-zinc-950">{order.courier_name}</span>
                          </div>
                        )}
                        {order.tracking_number && (
                          <div className="flex flex-col gap-1.5 bg-white border border-zinc-200 p-4 rounded-md">
                            <span className="text-xs font-medium text-zinc-500 tracking-wider">Nomor Resi</span>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-zinc-950 font-mono tracking-wider">{order.tracking_number}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopy(order.tracking_number!, `${order.id}-resi`); }}
                                className="shrink-0 p-2 rounded-md bg-white border border-zinc-200 hover:bg-neutral-800 transition-colors text-white ml-2"
                              >
                                {copiedField === `${order.id}-resi` ? (
                                  <CheckCircle size={14} className="text-emerald-500" />
                                ) : (
                                  <Copy size={14} className="text-zinc-500" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : order.inventory_content ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck size={14} className="text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-500">Detail Produk / Kredensial</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {parseContent(order.inventory_content).map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-1.5 font-mono tracking-wider bg-white border border-zinc-200 p-4 rounded-md">
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{item.label}</span>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-zinc-950 select-all break-all">{item.value}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopy(item.value, `${order.id}-${idx}`); }}
                                className="shrink-0 p-2 rounded-md bg-white border border-zinc-200 hover:bg-neutral-800 transition-colors text-white ml-2"
                              >
                                {copiedField === `${order.id}-${idx}` ? (
                                  <CheckCircle size={14} className="text-emerald-500" />
                                ) : (
                                  <Copy size={14} className="text-zinc-500" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
