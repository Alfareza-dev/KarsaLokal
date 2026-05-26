"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Truck, MapPin, Store, AlertCircle } from "lucide-react";
import { FaWhatsapp, FaInstagram, FaTelegram } from "react-icons/fa";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface StoreContact {
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  storeName?: string;
}

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productSlug: string;
  productName: string;
  productImageUrl?: string | null;
  storeContact: StoreContact;
  paymentMode: "manual" | "gateway";
  productPrice: number;
  flashSalePrice: number | null;
  userId: string | null;
  availableStock?: number | null;
  productWeight: number;
  originVillageCode?: string | null;
}

type PaymentMethod = {
  id: string;
  label: string;
  sublabel: string;
  iconUrl: string;
  color: string;
  bg: string;
  border: string;
  fee: string;
};

const paymentMethods: PaymentMethod[] = [
  { id: "qris", label: "QRIS", sublabel: "Scan QR", fee: "Biaya: 0.7% + Rp 400", iconUrl: "/payment/qris.svg", color: "text-violet-600", bg: "bg-violet-50 hover:bg-violet-100", border: "border-violet-200" },
  { id: "gopay", label: "GoPay", sublabel: "Via QR", fee: "Biaya: 0.7% + Rp 400", iconUrl: "/payment/gopay.png", color: "text-emerald-600", bg: "bg-emerald-50 hover:bg-emerald-100", border: "border-emerald-200" },
  { id: "shopeepay", label: "ShopeePay", sublabel: "Deeplink", fee: "Biaya: 0.7% + Rp 400", iconUrl: "/payment/spay.png", color: "text-orange-600", bg: "bg-orange-50 hover:bg-orange-100", border: "border-orange-200" },
  { id: "bni_va", label: "BNI VA", sublabel: "Virtual Account", fee: "Biaya: Rp 6.500", iconUrl: "/payment/bni.png", color: "text-sky-600", bg: "bg-sky-50 hover:bg-sky-100", border: "border-sky-200" },
  { id: "bri_va", label: "BRI VA", sublabel: "Virtual Account", fee: "Biaya: Rp 6.500", iconUrl: "/payment/bri.png", color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100", border: "border-blue-200" },
  { id: "permata_va", label: "Permata VA", sublabel: "Virtual Account", fee: "Biaya: Rp 6.500", iconUrl: "/payment/permata.svg", color: "text-teal-600", bg: "bg-teal-50 hover:bg-teal-100", border: "border-teal-200" },
  { id: "cimb_niaga_va", label: "CIMB VA", sublabel: "Virtual Account", fee: "Biaya: Rp 6.500", iconUrl: "/payment/cimb.png", color: "text-red-600", bg: "bg-red-50 hover:bg-red-100", border: "border-red-200" },
];

export function OrderModal({
  isOpen, onClose, productId, productSlug, productName, productImageUrl,
  storeContact, paymentMode, productPrice, flashSalePrice, userId, availableStock,
  productWeight, originVillageCode
}: OrderModalProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // Shipping State
  const [shippingType, setShippingType] = useState<"delivery" | "pickup">("delivery");
  const [userAddress, setUserAddress] = useState<any>(null);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [defaultOriginCode, setDefaultOriginCode] = useState<string | null>(null);
  
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [isFetchingShipping, setIsFetchingShipping] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);

  // Fetch user address & config
  useEffect(() => {
    if (isOpen && userId) {
      const fetchData = async () => {
        setIsFetchingAddress(true);
        try {
          const [addressRes, { data: config }] = await Promise.all([
            fetch('/api/shipping/address'),
            supabase.from("store_configs").select("default_village_code").eq("id", 1).single()
          ]);
          
          const addressData = await addressRes.json();
          setUserAddress(addressData.address || null);
          setDefaultOriginCode(config?.default_village_code || null);
        } catch (e) {
          console.error("Error fetching address/config:", e);
        } finally {
          setIsFetchingAddress(false);
        }
      };
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedMethod(null);
        setErrorMsg("");
        setIsLoading(false);
        setPendingOrderId(null);
        setQuantity(1);
        setShippingType("delivery");
        setSelectedCourier(null);
        setShippingOptions([]);
      }, 300);
    }
  }, [isOpen]);

  // Fetch Shipping Options
  useEffect(() => {
    if (shippingType === "delivery" && userAddress?.village_code && (originVillageCode || defaultOriginCode)) {
      const fetchShipping = async () => {
        setIsFetchingShipping(true);
        setSelectedCourier(null);
        try {
          const origin = originVillageCode || defaultOriginCode;
          const totalWeight = Math.max(1, productWeight * quantity); // Assuming minimum 1
          
          const res = await fetch(`/api/shipping/cost?origin_village_code=${origin}&destination_village_code=${userAddress.village_code}&weight=${totalWeight}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setShippingOptions(data);
            if (data.length > 0) setSelectedCourier(data[0]);
          } else {
            setShippingOptions([]);
          }
        } catch (e) {
          console.error("Failed to fetch shipping", e);
        } finally {
          setIsFetchingShipping(false);
        }
      };
      fetchShipping();
    }
  }, [shippingType, userAddress, originVillageCode, defaultOriginCode, quantity, productWeight]);

  const handlePay = async () => {
    if (!selectedMethod) return;
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    
    if (shippingType === "delivery" && !userAddress) {
      setErrorMsg("Isi Alamat Pengiriman Terlebih Dahulu");
      return;
    }
    
    if (shippingType === "delivery" && !selectedCourier) {
      setErrorMsg("Pilih kurir pengiriman terlebih dahulu");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const shippingCost = shippingType === "pickup" ? 0 : (selectedCourier?.price || 0);
      const courierName = shippingType === "pickup" ? "pickup" : selectedCourier?.courier_name;
      const courierCode = shippingType === "pickup" ? "pickup" : selectedCourier?.courier_code;

      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          product_id: productId, 
          payment_type: selectedMethod, 
          quantity,
          shipping_method: shippingType,
          shipping_cost: shippingCost,
          courier_name: courierName,
          courier_code: courierCode
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.pending_order_id) {
          setErrorMsg(data.error || "Anda memiliki pesanan yang belum dibayar.");
          setPendingOrderId(data.pending_order_id);
          setIsLoading(false);
          return;
        }
        setErrorMsg(data.error || "Gagal membuat pembayaran.");
        setIsLoading(false);
        return;
      }
      onClose();
      router.push(`/checkout/${data.order_id}`);
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan.");
      setIsLoading(false);
    }
  };

  const displayPrice = flashSalePrice ?? productPrice;

  // Render logic continues below...
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm" />
        
        <motion.div initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[28px] shadow-xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto z-10 flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h3 className="text-lg font-bold text-zinc-950">Detail Pesanan</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">Tutup</button>
          </div>

          <div className="px-6 py-5 flex-1 overflow-y-auto">
            {/* Product Summary */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex gap-4 mb-6">
              {productImageUrl ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 shrink-0 relative bg-white">
                  <Image src={productImageUrl} alt={productName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                  <span className="text-xl">📦</span>
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-sm font-bold text-zinc-950 truncate mb-1">{productName}</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-extrabold text-zinc-950">Rp {displayPrice.toLocaleString("id-ID")}</span>
                  {availableStock !== null && availableStock !== undefined && (
                    <span className="text-[10px] text-zinc-500 font-medium">Stok: {availableStock}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div className="flex justify-between items-center bg-white border border-zinc-200 rounded-2xl p-4 mb-6">
              <span className="text-sm font-bold text-zinc-950">Kuantitas</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isLoading}
                  className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-950 disabled:opacity-50"
                >
                  -
                </button>
                <span className="font-bold text-sm min-w-[20px] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(availableStock || 99, quantity + 1))}
                  disabled={(availableStock !== undefined && availableStock !== null && quantity >= availableStock) || isLoading}
                  className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-950 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>

            {/* Shipping Mode Tabs */}
            <div className="mb-6">
              <div className="flex p-1 bg-zinc-100 rounded-xl mb-4">
                <button
                  onClick={() => setShippingType("delivery")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    shippingType === "delivery" ? "bg-white text-zinc-950 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  <Truck size={16} /> Diantar
                </button>
                <button
                  onClick={() => setShippingType("pickup")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    shippingType === "pickup" ? "bg-white text-zinc-950 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  <Store size={16} /> Ambil Sendiri
                </button>
              </div>

              {shippingType === "delivery" && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                  {isFetchingAddress ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 size={16} className="animate-spin" /> Memuat alamat...</div>
                  ) : userAddress ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-zinc-950">{userAddress.recipient_name} <span className="font-normal text-zinc-500">({userAddress.phone_number})</span></p>
                          <p className="text-xs text-zinc-600 mt-1">{userAddress.full_address}</p>
                        </div>
                      </div>
                      <button onClick={() => { onClose(); router.push('/dashboard/address'); }} className="text-xs font-semibold text-blue-600 hover:text-blue-700 self-start">Ubah Alamat</button>
                      
                      <div className="mt-2 pt-3 border-t border-zinc-200">
                        <p className="text-xs font-bold text-zinc-950 mb-2">Pilih Kurir:</p>
                        {isFetchingShipping ? (
                          <div className="text-xs text-zinc-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Menghitung ongkir...</div>
                        ) : shippingOptions.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {shippingOptions.map((opt: any, i: number) => (
                              <label key={i} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedCourier?.courier_code === opt.courier_code && selectedCourier?.price === opt.price ? 'border-zinc-950 bg-white' : 'border-zinc-200 bg-white hover:bg-zinc-50'}`}>
                                <div className="flex items-center gap-2">
                                  <input type="radio" name="courier" checked={selectedCourier?.courier_code === opt.courier_code && selectedCourier?.price === opt.price} onChange={() => setSelectedCourier(opt)} className="text-zinc-950 focus:ring-zinc-950" />
                                  <span className="text-sm font-semibold text-zinc-950">{opt.courier_name}</span>
                                </div>
                                <span className="text-sm font-bold text-zinc-950">Rp {opt.price?.toLocaleString("id-ID")}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-red-500 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-2"><AlertCircle size={14}/> Tidak ada kurir tersedia untuk rute ini.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-zinc-500 mb-3">Alamat pengiriman belum diatur.</p>
                      <button onClick={() => { onClose(); router.push('/dashboard/address'); }} className="bg-zinc-950 text-white text-sm font-bold py-2 px-4 rounded-lg">Isi Alamat Sekarang</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-zinc-950 mb-3">Metode Pembayaran</h4>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((pm) => (
                  <button key={pm.id} onClick={() => setSelectedMethod(pm.id)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedMethod === pm.id ? 'border-zinc-950 bg-zinc-50 shadow-sm' : 'border-zinc-200 bg-white hover:bg-zinc-50'}`}>
                    <div className="w-8 h-8 relative rounded bg-white border border-zinc-100 shrink-0 flex items-center justify-center p-1">
                      <Image src={pm.iconUrl} alt={pm.label} fill className="object-contain p-1" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-950 leading-tight">{pm.label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{pm.sublabel}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Billing Summary */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-2">
              <div className="flex justify-between text-sm mb-2 text-zinc-600">
                <span>Total Harga ({quantity} barang)</span>
                <span className="font-semibold text-zinc-950">Rp {(displayPrice * quantity).toLocaleString("id-ID")}</span>
              </div>
              
              {shippingType === "delivery" && (
                <div className="flex justify-between text-sm mb-2 text-zinc-600">
                  <span>Ongkos Kirim</span>
                  <span className="font-semibold text-zinc-950">Rp {(selectedCourier?.price || 0).toLocaleString("id-ID")}</span>
                </div>
              )}
              
              {selectedMethod && (
                <div className="flex justify-between text-sm mb-3 text-zinc-600">
                  <span>Biaya Layanan</span>
                  <span className="font-semibold text-zinc-950">
                    Rp {(() => {
                      const pm = paymentMethods.find(m => m.id === selectedMethod);
                      if (!pm) return "0";
                      if (pm.id.endsWith("_va")) return "6.500";
                      return Math.round((displayPrice * quantity + (shippingType === "delivery" ? (selectedCourier?.price || 0) : 0)) * 0.007 + 400).toLocaleString("id-ID");
                    })()}
                  </span>
                </div>
              )}
              
              <div className="pt-3 border-t border-zinc-200 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-950">Total Bayar</span>
                <span className="text-lg font-extrabold text-zinc-950">
                  Rp {(() => {
                    const itemsCost = displayPrice * quantity;
                    const shipping = shippingType === "delivery" ? (selectedCourier?.price || 0) : 0;
                    let fee = 0;
                    const pm = paymentMethods.find(m => m.id === selectedMethod);
                    if (pm) {
                      if (pm.id.endsWith("_va")) fee = 6500;
                      else fee = Math.round((itemsCost + shipping) * 0.007 + 400);
                    }
                    return (itemsCost + shipping + fee).toLocaleString("id-ID");
                  })()}
                </span>
              </div>
            </div>
            
            {errorMsg && (
              <div className="mt-4 bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-200 text-center">
                {errorMsg}
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-zinc-100 bg-white">
            <button
              onClick={handlePay}
              disabled={
                !selectedMethod || isLoading || 
                (shippingType === "delivery" && !userAddress) || 
                (shippingType === "delivery" && !selectedCourier)
              }
              className="w-full bg-zinc-950 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Bayar Sekarang"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
