"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Clock, Copy, CheckCircle2, XCircle, ArrowLeft,
  Download, Loader2, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderData {
  id: number;
  user_id: string;
  product_id: number | null;
  product_name: string | null;
  amount: number;
  quantity?: number;
  status: string;
  reference_id: string | null;
  payment_method: string | null;
  louvin_transaction_id: string | null;
  expired_at: string | null;
  qr_string: string | null;
  va_number: string | null;
  bank: string | null;
  created_at: string;
}

interface ProductData {
  name: string;
  slug: string;
  emoji: string | null;
  image_url: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
}

interface CheckoutClientProps {
  order: OrderData;
  product: ProductData | null;
  inventoryContent: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseContentData(raw: string): { label: string; value: string }[] {
  // Try JSON parse first
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed).map(([key, val]) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        value: String(val),
      }));
    }
  } catch { /* not JSON */ }

  // Try "key: value" lines
  const lines = raw.split("\n").filter(Boolean);
  const pairs: { label: string; value: string }[] = [];
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      pairs.push({
        label: line.slice(0, colonIdx).trim(),
        value: line.slice(colonIdx + 1).trim(),
      });
    } else {
      pairs.push({ label: "Info", value: line.trim() });
    }
  }
  return pairs.length > 0 ? pairs : [{ label: "Detail", value: raw }];
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = h > 0 ? Math.floor((totalSeconds % 3600) / 60) : Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bni_va: "BNI Virtual Account",
  bri_va: "BRI Virtual Account",
  permata_va: "Permata Virtual Account",
  cimb_niaga_va: "CIMB Niaga Virtual Account",
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function CheckoutClient({ order, product, inventoryContent }: CheckoutClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [countdown, setCountdown] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [deliveredContent, setDeliveredContent] = useState(inventoryContent);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  const isQR = order.payment_method === "qris" || order.payment_method === "gopay";
  const isVA = ["bni_va", "bri_va", "permata_va", "cimb_niaga_va"].includes(order.payment_method || "");
  const isShopeePay = order.payment_method === "shopeepay";

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!order.expired_at || status !== "pending") return;

    const update = () => {
      const diff = new Date(order.expired_at!).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("00:00");
        setStatus("failed");
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        return;
      }
      setCountdown(formatCountdown(diff));
    };
    update();
    countdownRef.current = setInterval(update, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [order.expired_at, status]);

  // ── Real-time order status and Mount check ──────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    
    // Check current status on mount (useful for back-forward cache)
    const checkStatus = async () => {
      const { data } = await supabase
        .from("orders")
        .select("status")
        .eq("id", order.id)
        .single();
      if (data && data.status && data.status !== status) {
        setStatus(data.status);
      }
    };
    checkStatus();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          if (payload.new.status) {
            setStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id, status]);

  // ── Polling for payment status ──────────────────────────────────────────────
  useEffect(() => {
    if (status === "cancelled") return;
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (status !== "pending" || !order.louvin_transaction_id) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/pay/status?id=${order.louvin_transaction_id}`);
        const data = await res.json();
        if (data.success && data.transaction.status === "settled") {
          setStatus("settled");
          // Fetch delivered content
          try {
            const invRes = await fetch(`/api/inventory-content?order_id=${order.id}`);
            const invData = await invRes.json();
            if (invData.content_data) setDeliveredContent(invData.content_data);
          } catch { /* best-effort */ }
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else if (data.success && data.transaction.status === "failed") {
          setStatus("failed");
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch { /* polling is best-effort */ }
    };

    pollingRef.current = setInterval(poll, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [status, order.louvin_transaction_id, order.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDownloadQR = useCallback(() => {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-payment-${order.id}.png`;
    a.click();
    toast.success("QR Code berhasil diunduh!");
  }, [order.id]);

  const handleCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      const res = await fetch("/api/pay/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pesanan berhasil dibatalkan.");
        setStatus("cancelled");
        setTimeout(() => {
          if (data.product_slug) {
            router.push(`/product/${data.product_slug}`);
          } else {
            router.push("/");
          }
        }, 1500);
      } else {
        toast.error(data.error || "Gagal membatalkan pesanan.");
        setIsCancelling(false);
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
      setIsCancelling(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-zinc-200">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => product ? router.replace(`/product/${product.slug}`) : router.replace('/store')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-950 shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-sm font-bold text-zinc-950 truncate flex-1">
            {status === "settled" ? "Pembayaran Berhasil" : status === "pending" ? "Menunggu Pembayaran" : "Status Pesanan"}
          </h2>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 pb-20">
        {/* Product Card */}
        {product && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 bg-zinc-50 rounded-2xl p-4 border border-zinc-200 shadow-none mb-6"
          >
            <div
              className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${product.gradient_from || "#FAFAFA"} 0%, ${product.gradient_to || "var(--color-primary-hover)"} 100%)`,
              }}
            >
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="56px" />
              ) : (
                <span className="text-2xl">{product.emoji || ""}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-950 truncate">{order.product_name || product.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500">Order #{order.id}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-xs font-semibold text-zinc-950">{order.quantity || 1} Item</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-extrabold text-zinc-950">Rp{order.amount.toLocaleString("id-ID")}</p>
            </div>
          </motion.div>
        )}

        {/* ─── PENDING STATUS ─────────────────────────────────────────── */}
        {status === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-5"
          >
            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl py-3 px-4">
              <Clock size={16} className="text-amber-600" />
              <span className="text-sm font-bold text-amber-700">Bayar dalam {countdown}</span>
            </div>

            {/* Payment Method Info */}
            <div className="bg-zinc-50 rounded-[24px] border border-zinc-200 shadow-none p-6">
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-zinc-200 border-dashed">
                <div className="flex items-center gap-3">
                  {order.payment_method && PAYMENT_ICONS[order.payment_method] && (
                    <div className="w-12 h-12 relative shrink-0 bg-white rounded-xl p-2 border border-zinc-200 shadow-none">
                      <Image
                        src={PAYMENT_ICONS[order.payment_method]}
                        alt={order.payment_method}
                        fill
                        className="object-contain p-1"
                        sizes="48px"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Metode Bayar</p>
                    <p className="text-sm font-extrabold text-zinc-950">
                      {PAYMENT_LABELS[order.payment_method || ""] || order.payment_method}
                    </p>
                  </div>
                </div>
                {order.reference_id && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">No. Referensi</p>
                    <p className="text-[11px] font-mono font-medium text-zinc-500">{order.reference_id}</p>
                  </div>
                )}
              </div>

              {/* QR Code Display */}
              {isQR && order.qr_string && (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 shadow-none">
                    <QRCodeSVG value={order.qr_string} size={220} level="M" includeMargin />
                  </div>
                  {/* Hidden canvas for download */}
                  <div ref={qrCanvasRef} className="hidden">
                    <QRCodeCanvas value={order.qr_string} size={400} level="M" includeMargin />
                  </div>
                  <button
                    onClick={handleDownloadQR}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-950 hover:text-zinc-950-hover transition-colors bg-white px-4 py-2 rounded-xl"
                  >
                    <Download size={16} />
                    Simpan QR
                  </button>
                  <p className="text-xs text-zinc-500 text-center">Scan QR Code dengan aplikasi e-wallet atau mobile banking</p>
                </div>
              )}

              {/* VA Number Display */}
              {isVA && order.va_number && (
                <div className="flex flex-col gap-4">
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 mb-2">Nomor Virtual Account ({order.bank?.toUpperCase()})</p>
                    <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-3 justify-center">
                      <span className="text-lg font-mono font-bold text-zinc-950 tracking-wider select-all">
                        {order.va_number}
                      </span>
                      <button
                        onClick={() => handleCopy(order.va_number!)}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-white transition-colors"
                      >
                        {copied ? (
                          <CheckCircle2 size={18} className="text-green-500" />
                        ) : (
                          <Copy size={18} className="text-zinc-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs text-blue-800 font-medium mb-1">Cara Bayar:</p>
                    <ol className="text-xs text-blue-700 list-decimal list-inside space-y-0.5">
                      <li>Buka aplikasi mobile banking / ATM</li>
                      <li>Pilih Transfer ke Virtual Account</li>
                      <li>Masukkan nomor VA di atas</li>
                      <li>Konfirmasi nominal dan bayar</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* ShopeePay */}
              {isShopeePay && (
                <div className="text-center">
                  <p className="text-sm text-zinc-500 mb-3">Bayar melalui aplikasi ShopeePay.</p>
                  {order.qr_string && (
                    <div className="flex flex-col items-center gap-4 mb-4">
                      <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 shadow-none">
                        <QRCodeSVG value={order.qr_string} size={220} level="M" includeMargin />
                      </div>
                      <div ref={qrCanvasRef} className="hidden">
                        <QRCodeCanvas value={order.qr_string} size={400} level="M" includeMargin />
                      </div>
                      <button
                        onClick={handleDownloadQR}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-950 hover:text-zinc-950-hover transition-colors bg-white px-4 py-2 rounded-xl"
                      >
                        <Download size={16} />
                        Simpan QR
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Polling indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 py-2">
              <Loader2 size={12} className="animate-spin" />
              <span>Menunggu pembayaran... Halaman akan otomatis diperbarui.</span>
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl py-3 transition-all disabled:opacity-60"
            >
              {isCancelling ? (
                <><Loader2 size={16} className="animate-spin" /> Membatalkan...</>
              ) : (
                <><XCircle size={16} /> Batal / Ganti Metode Bayar</>
              )}
            </button>
          </motion.div>
        )}

        {/* ─── SETTLED (SUCCESS) STATUS ───────────────────────────────── */}
        {status === "settled" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-5"
          >
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
              >
                <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-3 border-2 border-emerald-200">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
              </motion.div>
              <h3 className="text-lg font-bold text-zinc-950 mb-1">Pembayaran Berhasil! </h3>
              <p className="text-sm text-zinc-500">Pesanan sebanyak {order.quantity || 1} item telah diproses.</p>
            </div>

            {/* Delivered Product Content */}
            {deliveredContent && (
              <div className="bg-zinc-50 rounded-2xl border border-zinc-200 shadow-none p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck size={18} className="text-zinc-950" />
                  <h4 className="text-sm font-bold text-zinc-950">Detail Produk</h4>
                </div>
                <div className="flex flex-col gap-3">
                  {parseContentData(deliveredContent).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-zinc-200">
                      <span className="text-xs font-medium text-zinc-500">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-950 font-mono select-all">{item.value}</span>
                        <button
                          onClick={() => handleCopy(item.value)}
                          className="shrink-0 p-1 rounded-md hover:bg-white transition-colors"
                        >
                          <Copy size={14} className="text-zinc-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-3 text-center">
                  Simpan informasi ini dengan aman. Klik ikon salin untuk menyalin.
                </p>
              </div>
            )}

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-zinc-950 text-white font-bold py-3.5 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Lihat Riwayat Pesanan
            </button>
          </motion.div>
        )}

        {/* ─── FAILED / CANCELLED STATUS ──────────────────────────────── */}
        {(status === "failed" || status === "cancelled") && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5"
          >
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3 border-2 border-red-200">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-1">
                {status === "cancelled" ? "Pesanan Dibatalkan" : "Pembayaran Gagal"} 
              </h3>
              <p className="text-sm text-zinc-500">
                {status === "cancelled"
                  ? "Pembelian dibatalkan oleh sistem."
                  : "Pembayaran tidak berhasil atau sudah kedaluwarsa. Silakan coba lagi."}
              </p>
            </div>

            <button
              onClick={() => product ? router.replace(`/product/${product.slug}`) : router.replace('/store')}
              className="w-full bg-zinc-950 text-white font-bold py-3.5 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Kembali ke Produk
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full text-center text-zinc-500 text-sm font-medium py-2 hover:bg-white hover:text-zinc-950 rounded-xl transition-colors"
            >
              Lihat Riwayat Pesanan
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
