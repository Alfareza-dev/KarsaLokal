"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Receipt, Search, Clock, CheckCircle, XCircle, Ban,
  RefreshCw, ChevronDown, ExternalLink, Filter,
  MoreVertical, Mail, CheckCircle2, Copy, Eye, X, AlertTriangle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: number;
  user_id: string;
  product_id: number | null;
  product_name: string | null;
  amount: number;
  status: string;
  reference_id: string | null;
  payment_method: string | null;
  louvin_transaction_id: string | null;
  created_at: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
};

type Tab = "all" | "pending" | "settled" | "failed" | "cancelled";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string; dot: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-zinc-500", bg: "bg-white", dot: "bg-neutral-500" },
  settled: { label: "Berhasil", icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-200", dot: "bg-emerald-500" },
  failed: { label: "Gagal", icon: AlertTriangle, color: "text-zinc-500", bg: "bg-white", dot: "bg-neutral-600" },
  cancelled: { label: "Dibatalkan", icon: Ban, color: "text-zinc-500", bg: "bg-white", dot: "bg-neutral-700" },
};

const PAYMENT_LABELS: Record<string, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bni_va: "BNI VA",
  bri_va: "BRI VA",
  permata_va: "Permata VA",
  cimb_niaga_va: "CIMB VA",
};

const PAYMENT_ICONS: Record<string, string> = {
  qris: "/payment/qris.svg",
  gopay: "/payment/gopay.png",
  shopeepay: "/payment/spay.png",
  bni_va: "/payment/bni.png",
  bri_va: "/payment/bri.png",
  permata_va: "/payment/permata.svg",
  cimb_niaga_va: "/payment/cimb.png",
};

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "pending", label: "Pending" },
  { id: "settled", label: "Berhasil" },
  { id: "failed", label: "Gagal" },
  { id: "cancelled", label: "Dibatalkan" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && ordersData) {
      setOrders(ordersData);

      // Fetch unique user profiles
      const userIds = [...new Set(ordersData.map((o) => o.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        if (profilesData) {
          const profileMap: Record<string, string> = {};
          profilesData.forEach((p: UserProfile) => {
            profileMap[p.id] = p.full_name || "User";
          });
          setProfiles(profileMap);
        }
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ── Filtering ───────────────────────────────────────────────────────────────

  const filtered = orders.filter((order) => {
    if (activeTab !== "all" && order.status !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (order.product_name || "").toLowerCase().includes(q) ||
        (order.reference_id || "").toLowerCase().includes(q) ||
        String(order.id).includes(q) ||
        (profiles[order.user_id] || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    settled: orders.filter((o) => o.status === "settled").length,
    failed: orders.filter((o) => o.status === "failed").length,
    totalRevenue: orders
      .filter((o) => o.status === "settled")
      .reduce((sum, o) => sum + o.amount, 0),
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "settle" | "resend" | "cancel" | null;
    orderId: number | null;
    title: string;
    message: string;
    sendEmail?: boolean;
  }>({
    isOpen: false,
    type: null,
    orderId: null,
    title: "",
    message: "",
    sendEmail: true,
  });

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    order: Order | null;
    inventoryContent: string | null;
    isLoadingInventory: boolean;
  }>({
    isOpen: false,
    order: null,
    inventoryContent: null,
    isLoadingInventory: false,
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Berhasil disalin!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewDetail = async (order: Order) => {
    setOpenDropdownId(null);
    setDetailModal({ isOpen: true, order, inventoryContent: null, isLoadingInventory: false });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeAction = async () => {
    const { type, orderId, sendEmail } = confirmModal;
    if (!type || !orderId) return;

    setProcessingId(orderId);
    setConfirmModal({ ...confirmModal, isOpen: false });

    try {
      let endpoint = '';
      let body: any = undefined;

      if (type === "settle") {
        endpoint = `/api/admin/transactions/${orderId}/settle`;
        body = { sendEmail };
      } else if (type === "resend") {
        endpoint = `/api/admin/transactions/${orderId}/resend-email`;
      } else if (type === "cancel") {
        endpoint = `/api/admin/transactions/${orderId}/cancel`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || `Gagal mengeksekusi aksi`);
      
      if (type === "settle") {
        toast.success(sendEmail ? "Pesanan berhasil disettle dan email dikirim!" : "Pesanan berhasil disettle!");
        fetchData();
      } else if (type === "resend") {
        toast.success("Email berhasil dikirim ulang!");
      } else if (type === "cancel") {
        toast.success("Pesanan berhasil dibatalkan!");
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualSettle = (orderId: number) => {
    setOpenDropdownId(null);
    setConfirmModal({
      isOpen: true,
      type: "settle",
      orderId,
      title: "Tandai Selesai",
      message: "Apakah Anda yakin ingin menyelesaikan pesanan ini? Sistem akan memotong stok produk secara otomatis.",
      sendEmail: true,
    });
  };

  const handleCancel = (orderId: number) => {
    setOpenDropdownId(null);
    setConfirmModal({
      isOpen: true,
      type: "cancel",
      orderId,
      title: "Tolak / Batal Pesanan",
      message: "Apakah Anda yakin ingin menolak atau membatalkan pesanan ini? Status pesanan akan diubah menjadi Dibatalkan.",
    });
  };

  const handleResendEmail = (orderId: number) => {
    setOpenDropdownId(null);
    setConfirmModal({
      isOpen: true,
      type: "resend",
      orderId,
      title: "Kirim Ulang Email",
      message: "Apakah Anda yakin ingin mengirim ulang email lisensi ke pembeli? Aksi ini tidak akan memotong stok."
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 w-24 bg-white rounded"></div>
          </div>
          <div className="h-10 w-28 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-zinc-200 h-20"></div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="h-10 w-full md:w-[300px] bg-white rounded-xl"></div>
          <div className="h-10 w-full md:max-w-sm bg-white rounded-xl"></div>
        </div>
        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 shadow-none overflow-hidden h-[400px]">
          <div className="w-full h-12 bg-white border-b border-zinc-200"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-full h-16 border-b border-gray-50 flex items-center px-4 gap-4">
              <div className="h-4 w-8 bg-white rounded"></div>
              <div className="h-4 w-24 bg-white rounded"></div>
              <div className="h-4 w-32 bg-white rounded"></div>
              <div className="h-4 w-20 bg-white rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-2">
            <Receipt size={24} className="text-zinc-950" />
            Transaksi
          </h1>
          <p className="text-zinc-500 text-sm mt-1">{stats.total} transaksi total</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-950 bg-white hover:bg-white/10 px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Revenue" value={`Rp${stats.totalRevenue.toLocaleString("id-ID")}`} color="text-zinc-950" bg="bg-white" />
        <StatCard label="Pending" value={String(stats.pending)} color="text-zinc-500" bg="bg-white" />
        <StatCard label="Berhasil" value={String(stats.settled)} color="text-white" bg="bg-white" />
        <StatCard label="Gagal" value={String(stats.failed)} color="text-zinc-500" bg="bg-white" />
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-zinc-50 text-zinc-950 shadow-none"
                  : "text-zinc-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.id !== "all" && (
                <span className="ml-1 text-[10px] text-zinc-500">
                  ({orders.filter((o) => tab.id === "all" ? true : o.status === tab.id).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Cari produk, ref ID, atau user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-zinc-300 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-50 rounded-2xl border border-zinc-200 shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-bold text-zinc-500 text-xs">#</th>
                <th className="text-left px-4 py-3 font-bold text-zinc-500 text-xs">User</th>
                <th className="text-left px-4 py-3 font-bold text-zinc-500 text-xs">Produk</th>
                <th className="text-left px-4 py-3 font-bold text-zinc-500 text-xs">Metode</th>
                <th className="text-right px-4 py-3 font-bold text-zinc-500 text-xs">Nominal</th>
                <th className="text-center px-4 py-3 font-bold text-zinc-500 text-xs">Status</th>
                <th className="text-left px-4 py-3 font-bold text-zinc-500 text-xs">Ref ID</th>
                <th className="text-left px-4 py-3 font-bold text-zinc-500 text-xs">Tanggal</th>
                <th className="text-center px-4 py-3 font-bold text-zinc-500 text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-500 text-sm">
                    <Filter size={32} className="mx-auto mb-2 text-gray-300" />
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const Icon = sc.icon;
                  const date = new Date(order.created_at);

                  return (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">#{order.id}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-zinc-950 truncate max-w-[140px]">
                          {profiles[order.user_id] || "Unknown"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-zinc-950 truncate max-w-[160px]">
                          {order.product_name || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {order.payment_method ? (
                          <div className="flex items-center gap-2">
                            {PAYMENT_ICONS[order.payment_method] && (
                              <div className="w-5 h-5 relative shrink-0">
                                <Image
                                  src={PAYMENT_ICONS[order.payment_method]}
                                  alt={order.payment_method}
                                  fill
                                  className="object-contain"
                                  sizes="20px"
                                />
                              </div>
                            )}
                            <span className="text-xs font-medium text-zinc-500">
                              {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-zinc-950">
                          Rp{order.amount.toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-zinc-500 truncate block max-w-[100px]">
                          {order.reference_id || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-zinc-500">
                          {date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center relative">
                        {processingId === order.id ? (
                          <div className="flex justify-center">
                            <div className="w-5 h-5 border-2 border-zinc-300/30 border-t-primary rounded-full animate-spin" />
                          </div>
                        ) : (
                          <div className="relative inline-block text-left" ref={openDropdownId === order.id ? dropdownRef : null}>
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === order.id ? null : order.id)}
                              className="p-1.5 text-zinc-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openDropdownId === order.id && (
                              <div className="absolute right-0 z-10 mt-1 w-40 origin-top-right rounded-xl bg-zinc-50 shadow-none ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
                                <div className="py-1">
                                  {(order.status === "pending" || order.status === "failed") && (
                                    <>
                                      <button
                                        onClick={() => handleManualSettle(order.id)}
                                        className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-950 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                      >
                                        <CheckCircle2 size={16} className="text-zinc-500 group-hover:text-emerald-600" />
                                        Tandai Selesai
                                      </button>
                                      <button
                                        onClick={() => handleCancel(order.id)}
                                        className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-950 hover:bg-red-50 hover:text-red-700 transition-colors"
                                      >
                                        <XCircle size={16} className="text-zinc-500 group-hover:text-red-600" />
                                        Tolak / Batal
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleViewDetail(order)}
                                    className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-950 hover:bg-gray-50 transition-colors"
                                  >
                                    <Eye size={16} className="text-zinc-500 group-hover:text-gray-600" />
                                    Lihat Detail
                                  </button>
                                  {order.status === "settled" && (
                                    <button
                                      onClick={() => handleResendEmail(order.id)}
                                      className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-950 hover:bg-gray-50 hover:text-zinc-950 transition-colors"
                                    >
                                      <Mail size={16} className="text-zinc-500 group-hover:text-zinc-950" />
                                      Kirim Ulang Email
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal Konfirmasi */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/50 backdrop-blur-sm">
          <div className="bg-zinc-50 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-zinc-950 mb-2">{confirmModal.title}</h3>
              <p className="text-zinc-500 mb-6 leading-relaxed">{confirmModal.message}</p>
              
              {confirmModal.type === "settle" && (
                <label className="flex items-center gap-2 mb-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmModal.sendEmail ?? true}
                    onChange={(e) => setConfirmModal({ ...confirmModal, sendEmail: e.target.checked })}
                    className="w-4 h-4 text-zinc-950 bg-white border-zinc-300 rounded focus:ring-primary focus:ring-2"
                  />
                  <span className="text-sm text-zinc-950 font-medium">Kirim produk ke email pembeli</span>
                </label>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="px-4 py-2 font-medium text-zinc-500 bg-white hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={executeAction}
                  className={`px-4 py-2 font-medium text-white rounded-xl transition-colors flex items-center gap-2 ${
                    confirmModal.type === 'cancel' ? 'bg-red-500 hover:bg-red-600' : 'bg-zinc-950 hover:bg-zinc-800'
                  }`}
                >
                  {confirmModal.type === 'settle' ? <CheckCircle2 size={16} /> : confirmModal.type === 'cancel' ? <XCircle size={16} /> : <Mail size={16} />}
                  Ya, Lanjutkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Detail Modal */}
      {(() => {
        const order = detailModal.order;
        if (!detailModal.isOpen || !order) return null;
        
        return (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm" onClick={() => setDetailModal({ ...detailModal, isOpen: false })} />
            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-zinc-50 shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                  <Receipt size={20} className="text-zinc-950" />
                  Detail Transaksi
                </h2>
                <button 
                  onClick={() => setDetailModal({ ...detailModal, isOpen: false })}
                  className="p-2 text-zinc-500 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status & Date */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_CONFIG[order.status]?.bg} ${STATUS_CONFIG[order.status]?.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[order.status]?.dot}`} />
                      {STATUS_CONFIG[order.status]?.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-950">
                      {new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                {/* Order Info */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-zinc-200">
                    <div className="mb-4">
                      <p className="text-xs text-zinc-500 mb-1">User Pelanggan</p>
                      <p className="font-semibold text-zinc-950">{profiles[order.user_id] || "Unknown User"}</p>
                      <p className="text-xs font-mono text-zinc-500 mt-1 truncate">{order.user_id}</p>
                    </div>
                    <div className="mb-4 border-t border-zinc-200 pt-4">
                      <p className="text-xs text-zinc-500 mb-1">Produk Dibeli</p>
                      <p className="font-semibold text-zinc-950">{order.product_name || "Produk Tidak Diketahui"}</p>
                      <p className="text-lg font-bold text-zinc-950 mt-1">Rp{order.amount.toLocaleString("id-ID")}</p>
                    </div>
                    <div className="border-t border-zinc-200 pt-4">
                      <p className="text-xs text-zinc-500 mb-1">Metode Pembayaran</p>
                      <p className="font-semibold text-zinc-950">{PAYMENT_LABELS[order.payment_method || ""] || order.payment_method || "-"}</p>
                    </div>
                  </div>

                  {/* IDs Info */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Order ID</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white rounded-lg text-sm text-zinc-950 border border-zinc-200 truncate">
                          {order.id}
                        </code>
                        <button onClick={() => handleCopy(String(order.id), 'orderId')} className="p-2 text-zinc-500 hover:text-gray-600 bg-white border border-zinc-200 rounded-lg transition-colors">
                          {copiedId === 'orderId' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Reference ID</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white rounded-lg text-sm text-zinc-950 border border-zinc-200 truncate">
                          {order.reference_id || "-"}
                        </code>
                        {order.reference_id && (
                          <button onClick={() => handleCopy(order.reference_id!, 'refId')} className="p-2 text-zinc-500 hover:text-gray-600 bg-white border border-zinc-200 rounded-lg transition-colors">
                            {copiedId === 'refId' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Gateway Transaction ID (Louvin)</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white rounded-lg text-sm text-zinc-950 border border-zinc-200 truncate">
                          {order.louvin_transaction_id || "-"}
                        </code>
                        {order.louvin_transaction_id && (
                          <button onClick={() => handleCopy(order.louvin_transaction_id!, 'gatewayId')} className="p-2 text-zinc-500 hover:text-gray-600 bg-white border border-zinc-200 rounded-lg transition-colors">
                            {copiedId === 'gatewayId' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* No Inventory Detail Needed for Physical Goods */}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-4 border border-zinc-200`}>
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      <p className={`text-lg font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
