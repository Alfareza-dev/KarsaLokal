"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package, Search, CheckCircle, Truck, PackageCheck,
  RefreshCw, MapPin, MoreVertical, X, CheckCircle2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type ShippingOrder = {
  id: number;
  user_id: string;
  product_name: string | null;
  amount: number;
  shipping_status: "pending" | "packing" | "shipped" | "delivered" | null;
  shipping_method: string;
  courier_name: string | null;
  shipping_cost: number;
  tracking_number: string | null;
  created_at: string;
  address?: UserAddress;
};

type UserAddress = {
  recipient_name: string;
  phone_number: string;
  full_address: string;
  village_code: string;
};

type Tab = "all" | "pending" | "packing" | "shipped" | "delivered";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; dot: string }> = {
  pending: { label: "Menunggu Diproses", icon: Package, color: "text-zinc-700", bg: "bg-zinc-100", dot: "bg-zinc-400" },
  packing: { label: "Sedang Dikemas", icon: PackageCheck, color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  shipped: { label: "Dikirim", icon: Truck, color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  delivered: { label: "Diterima", icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
};

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "pending", label: "Perlu Dikemas" },
  { id: "packing", label: "Sedang Dikemas" },
  { id: "shipped", label: "Dikirim" },
  { id: "delivered", label: "Selesai" },
];

export default function ShippingManifestPage() {
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchData = useCallback(async () => {
    const supabase = createClient();
    setIsLoading(true);
    // Fetch orders that are settled AND using delivery
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "settled")
      .eq("shipping_method", "delivery")
      .order("created_at", { ascending: false });

    if (!ordersError && ordersData) {
      // Fetch addresses for these users
      const userIds = [...new Set(ordersData.map((o) => o.user_id))];
      let addressMap: Record<string, UserAddress> = {};
      
      if (userIds.length > 0) {
        const { data: addresses } = await supabase
          .from("user_addresses")
          .select("*")
          .in("user_id", userIds);
          
        if (addresses) {
          addresses.forEach((addr: any) => {
            addressMap[addr.user_id] = addr;
          });
        }
      }

      const merged = ordersData.map(o => ({
        ...o,
        address: addressMap[o.user_id],
      }));
      
      setOrders(merged);
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

  const filtered = orders.filter((order) => {
    const statusMatch = activeTab === "all" || order.shipping_status === activeTab;
    if (!statusMatch) return false;
    
    if (search) {
      const q = search.toLowerCase();
      return (
        (order.product_name || "").toLowerCase().includes(q) ||
        (order.address?.recipient_name || "").toLowerCase().includes(q) ||
        (order.tracking_number || "").toLowerCase().includes(q) ||
        String(order.id).includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.shipping_status === "pending").length,
    packing: orders.filter((o) => o.shipping_status === "packing").length,
    shipped: orders.filter((o) => o.shipping_status === "shipped").length,
  };

  // Resi Modal State
  const [resiModal, setResiModal] = useState<{
    isOpen: boolean;
    orderId: number | null;
    trackingNumber: string;
    status: string;
  }>({ isOpen: false, orderId: null, trackingNumber: "", status: "pending" });

  const handleOpenResiModal = (order: ShippingOrder) => {
    setResiModal({
      isOpen: true,
      orderId: order.id,
      trackingNumber: order.tracking_number || "",
      status: order.shipping_status || "pending",
    });
  };

  const handleUpdateShipping = async () => {
    if (!resiModal.orderId) return;
    
    // Auto set to shipped if tracking number is provided
    const newStatus = resiModal.trackingNumber ? "shipped" : resiModal.status;
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("orders")
        .update({
          tracking_number: resiModal.trackingNumber || null,
          shipping_status: newStatus,
        })
        .eq("id", resiModal.orderId);
        
      if (error) throw error;
      
      toast.success("Status pengiriman berhasil diperbarui!");
      setResiModal({ isOpen: false, orderId: null, trackingNumber: "", status: "pending" });
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal memperbarui: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-zinc-200 border-t-zinc-950 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-2">
            <Package size={24} className="text-zinc-950" />
            Pengiriman
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Kelola manifest pengiriman barang fisik UMKM</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 px-4 py-2 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Resi" value={String(stats.total)} />
        <StatCard label="Perlu Dikemas" value={String(stats.pending)} />
        <StatCard label="Sedang Dikemas" value={String(stats.packing)} />
        <StatCard label="Dalam Pengiriman" value={String(stats.shipped)} />
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl p-1 overflow-x-auto shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-zinc-950 text-white shadow-none"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {tab.label}
              {tab.id !== "all" && (
                <span className={`ml-1.5 text-[10px] ${activeTab === tab.id ? 'text-zinc-300' : 'text-zinc-400'}`}>
                  ({orders.filter((o) => o.shipping_status === tab.id).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari penerima, produk, atau resi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:border-zinc-950 transition-all shadow-sm text-zinc-950"
          />
        </div>
      </div>

      {/* Manifest Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center shadow-sm">
          <Package size={40} className="mx-auto mb-3 text-zinc-300" />
          <p className="text-zinc-500 text-sm font-medium">Tidak ada data pengiriman ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => {
            const sc = STATUS_CONFIG[order.shipping_status || "pending"];
            const StatusIcon = sc.icon;
            
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:border-zinc-300 transition-all flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                    <p className="text-xs text-zinc-400 mt-2 font-mono">Order #{order.id}</p>
                  </div>
                  <button 
                    onClick={() => handleOpenResiModal(order)}
                    className="text-xs font-bold text-zinc-950 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Update Resi
                  </button>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-zinc-950 truncate">{order.product_name}</h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Kurir: <span className="font-semibold text-zinc-950">{order.courier_name || "Tidak diketahui"}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Ongkir: <span className="font-semibold text-zinc-950">Rp {order.shipping_cost.toLocaleString("id-ID")}</span>
                  </p>
                </div>
                
                <div className="mt-auto bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-zinc-950">{order.address?.recipient_name || "Tanpa Nama"} <span className="text-zinc-500 font-normal">({order.address?.phone_number || "-"})</span></p>
                      <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed line-clamp-2">{order.address?.full_address || "Alamat tidak ditemukan"}</p>
                    </div>
                  </div>
                </div>
                
                {order.tracking_number && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">No. Resi</span>
                    <span className="text-sm font-mono font-bold text-zinc-950">{order.tracking_number}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resi Modal */}
      <AnimatePresence>
        {resiModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setResiModal({ ...resiModal, isOpen: false })} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-sm shadow-xl z-10 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h3 className="text-base font-bold text-zinc-950">Update Pengiriman</h3>
                <button onClick={() => setResiModal({ ...resiModal, isOpen: false })} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-950 mb-1.5">Status Pengiriman</label>
                  <select 
                    value={resiModal.status} 
                    onChange={(e) => setResiModal({ ...resiModal, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:border-zinc-950 transition-all text-zinc-950"
                  >
                    <option value="pending">Menunggu Diproses</option>
                    <option value="packing">Sedang Dikemas</option>
                    <option value="shipped">Dikirim</option>
                    <option value="delivered">Diterima</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-950 mb-1.5">Nomor Resi (Opsional)</label>
                  <input 
                    type="text" 
                    value={resiModal.trackingNumber} 
                    onChange={(e) => setResiModal({ ...resiModal, trackingNumber: e.target.value })}
                    placeholder="Contoh: JTL281983019"
                    className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:border-zinc-950 transition-all text-zinc-950 font-mono"
                  />
                </div>
                <button 
                  onClick={handleUpdateShipping}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-2.5 rounded-xl transition-colors mt-2 text-sm"
                >
                  Kirim Resi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm">
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      <p className="text-xl font-extrabold text-zinc-950">{value}</p>
    </div>
  );
}
