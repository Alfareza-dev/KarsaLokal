"use client";

import { useEffect, useRef, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  Package,
  Ruler,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OrderModal } from "@/components/public/OrderModal";

export function ProductDetailClient({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [titlePastHeader, setTitlePastHeader] = useState(false);

  const titleRef = useRef<HTMLHeadingElement>(null);

  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storeContact, setStoreContact] = useState({
    whatsapp: "",
    telegram: "",
    instagram: "",
    storeName: "",
  });
  const [flashSalePrice, setFlashSalePrice] = useState<number | null>(null);
  const [inventoryStock, setInventoryStock] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<"manual" | "gateway">("manual");
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch auth session for userId
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      setUserId(data.user?.id || null);
    }).catch(() => setUserId(null));
  }, []);

  useEffect(() => {
    params.then(({ slug }) => setSlug(slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    const fetchProduct = async () => {
      setIsLoading(true);
      const [{ data: productData }, { data: configData }] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("slug", slug)
          .eq("is_active", true)
          .single(),
        supabase
          .from("store_configs")
          .select("name, contact_whatsapp, contact_telegram, contact_instagram, payment_mode")
          .eq("id", 1)
          .single(),
      ]);

      setProduct(productData);
      if (configData) {
        setStoreContact({
          whatsapp: configData.contact_whatsapp || "",
          telegram: configData.contact_telegram || "",
          instagram: configData.contact_instagram || "",
          storeName: configData.name || "",
        });
        setPaymentMode(configData.payment_mode || "manual");
      }

      // Check for active flash sale for this product
      if (productData) {
        const now = new Date().toISOString();
        const { data: fsData } = await supabase
          .from("flash_sales")
          .select("sale_price")
          .eq("product_id", productData.id)
          .eq("is_active", true)
          .lte("start_at", now)
          .gte("end_at", now)
          .single();
        if (fsData) {
          setFlashSalePrice(fsData.sale_price);
        }

        // Fetch real-time stock count from inventory
        try {
          const res = await fetch(`/api/inventory-stock?product_id=${productData.id}`);
          const counts = await res.json();
          const stock = counts[productData.id.toString()] ?? 0;
          setInventoryStock(stock);
        } catch { /* stock fetch is best-effort */ }
      }

      setIsLoading(false);
    };

    fetchProduct();
  }, [slug]);

  // Track view
  useEffect(() => {
    if (!product) return;
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, productSlug: product.slug }),
    }).catch(console.error);
  }, [product]);

  // IntersectionObserver for sticky header title
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setTitlePastHeader(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  if (!isLoading && slug && !product) notFound();

  if (isLoading || !product) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 rounded-full border-4 border-zinc-200 border-t-zinc-950 animate-spin" />
      </div>
    );
  }

  const statusLabel: Record<string, { text: string; color: string }> = {
    ready: { text: "Stok Tersedia", color: "bg-green-50 text-green-700 border-green-200" },
    limited: { text: "Stok Terbatas", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    habis: { text: "Habis", color: "bg-red-50 text-red-600 border-red-200" },
  };
  // Auto-status based on payment mode
  let effectiveStatus = product.status || "ready";
  if (paymentMode === "gateway") {
    effectiveStatus = (inventoryStock !== null && inventoryStock === 0) ? "habis" : "ready";
  }
  const status = statusLabel[effectiveStatus];
  const isOutOfStock = effectiveStatus === "habis";

  // Flash sale price overrides current_price
  const displayPrice = flashSalePrice ?? product.current_price;
  const comparePrice = flashSalePrice ? product.current_price : product.normal_price;
  const showDiscount = comparePrice > displayPrice;
  const discount = showDiscount
    ? Math.round(((comparePrice - displayPrice) / comparePrice) * 100)
    : 0;

  const categoryName = product.category?.name || null;

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-zinc-200">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
            <button
              onClick={() => router.replace('/store')}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-950 shrink-0"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>

            <AnimatePresence>
              {titlePastHeader && (
                <motion.h2
                  key="header-title"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="text-sm font-bold text-zinc-950 truncate flex-1"
                >
                  {product.name}
                </motion.h2>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* PAGE BODY */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto px-4 pt-8 pb-32 md:py-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* LEFT: Product Image Gallery — 5 Columns */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-20">
                <motion.div
                  initial={{ scale: 0.97, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="relative w-full aspect-square rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50/50 p-4"
                >
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 460px"
                      className="object-cover rounded-xl"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 rounded-xl">
                      <Package size={64} className="text-zinc-300" />
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* RIGHT: Product Info — 7 Columns */}
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.38 }}
              className="lg:col-span-7 min-w-0"
            >
              {/* Category Badge */}
              {categoryName && (
                <span className="inline-block bg-zinc-100 text-zinc-800 text-xs px-2.5 py-1 rounded-md font-medium mb-3">
                  {categoryName}
                </span>
              )}

              {/* Product Title */}
              <h1
                ref={titleRef}
                className="text-3xl font-bold tracking-tight text-zinc-900 leading-tight mb-4"
              >
                {product.name}
              </h1>

              {/* Price block */}
              <div className="flex items-baseline gap-3 flex-wrap mb-5">
                <span className="text-3xl md:text-4xl font-extrabold text-zinc-950 tracking-tight">
                  Rp {displayPrice.toLocaleString("id-ID")}
                </span>
                {showDiscount && (
                  <span className="text-sm text-zinc-400 line-through">
                    Rp {comparePrice.toLocaleString("id-ID")}
                  </span>
                )}
                {showDiscount && (
                  <span className="bg-zinc-100 text-zinc-800 text-xs font-bold px-2.5 py-1 rounded-md border border-zinc-200">
                    Hemat {discount}%
                  </span>
                )}
                {flashSalePrice && (
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-md border border-red-200 animate-pulse">
                    Flash Sale
                  </span>
                )}
              </div>

              {/* Status & Stock Badges */}
              <div className="flex gap-2 flex-wrap mb-6">
                <span className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full border ${status.color}`}>
                  {status.text}
                </span>
                {inventoryStock === null ? (
                  <span className="inline-flex items-center bg-zinc-50 text-zinc-400 text-xs font-medium px-3 py-1.5 rounded-full border border-zinc-200 animate-pulse">
                    Memuat stok...
                  </span>
                ) : (
                  <span className="inline-flex items-center bg-zinc-50 text-zinc-600 text-xs font-medium px-3 py-1.5 rounded-full border border-zinc-200">
                    Sisa: {inventoryStock} unit
                  </span>
                )}
              </div>

              {/* Product Specs (Physical Product Metadata) */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-3 text-center">
                  <Package size={18} className="mx-auto text-zinc-400 mb-1" />
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Berat</p>
                  <p className="text-xs font-semibold text-zinc-800 mt-0.5">{product.weight || "—"}</p>
                </div>
                <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-3 text-center">
                  <Ruler size={18} className="mx-auto text-zinc-400 mb-1" />
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Dimensi</p>
                  <p className="text-xs font-semibold text-zinc-800 mt-0.5">{product.dimensions || "—"}</p>
                </div>
                <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-3 text-center">
                  <MapPin size={18} className="mx-auto text-zinc-400 mb-1" />
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Asal</p>
                  <p className="text-xs font-semibold text-zinc-800 mt-0.5">{product.origin || "Indonesia"}</p>
                </div>
              </div>

              {/* Desktop CTA */}
              <div className="hidden md:block mb-8">
                <motion.button
                  whileHover={isOutOfStock ? {} : { scale: 1.02 }}
                  whileTap={isOutOfStock ? {} : { scale: 0.98 }}
                  onClick={() => !isOutOfStock && setIsOrderModalOpen(true)}
                  disabled={isOutOfStock}
                  className={`w-full font-bold text-base py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                    isOutOfStock
                      ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                      : 'bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]'
                  }`}
                >
                  {isOutOfStock ? 'Stok Habis' : 'Pesan Sekarang'}
                </motion.button>
              </div>

              {/* Product Description */}
              <section className="mb-8">
                <h3 className="text-base font-bold text-zinc-900 mb-3">
                  Deskripsi Produk
                </h3>
                <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed">
                  <p>{product.description}</p>
                </div>
                {product.features && product.features.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {product.features.map((feature: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0" />
                        <span className="text-sm text-zinc-600">
                          {feature.question || feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* FAQ / Kebijakan Garansi */}
              {product.faq && product.faq.length > 0 && !(product.faq.length === 1 && !product.faq[0].question) && (
                <section className="mb-10">
                  <h3 className="text-base font-bold text-zinc-900 mb-3">
                    Kebijakan Garansi Pengiriman & Pengembalian
                  </h3>
                  <div className="flex flex-col gap-2">
                    {product.faq.map((item: any, idx: number) => {
                      const isOpen = openFaqIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={`rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border ${
                            isOpen
                              ? "bg-zinc-50 border-zinc-200"
                              : "bg-white border-zinc-100 hover:border-zinc-200"
                          }`}
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        >
                          <div className="flex items-center justify-between p-4">
                            <span className="text-sm font-semibold text-zinc-900 flex-1 pr-2">
                              {item.question}
                            </span>
                            {isOpen ? (
                              <ChevronUp size={17} className="text-zinc-500 shrink-0" />
                            ) : (
                              <ChevronDown size={17} className="text-zinc-400 shrink-0" />
                            )}
                          </div>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                key="faq-answer"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <p className="text-sm text-zinc-500 leading-relaxed px-4 pb-4">
                                  {item.answer}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* MOBILE: Sticky bottom CTA */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", damping: 20 }}
            className="w-full max-w-[480px] bg-white/95 backdrop-blur-md border-t border-zinc-200 px-4 pt-3 pb-6 pointer-events-auto"
          >
            <motion.button
              whileHover={isOutOfStock ? {} : { scale: 1.02 }}
              whileTap={isOutOfStock ? {} : { scale: 0.98 }}
              onClick={() => !isOutOfStock && setIsOrderModalOpen(true)}
              disabled={isOutOfStock}
              className={`w-full font-bold text-base py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                isOutOfStock
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]'
              }`}
            >
              {isOutOfStock ? 'Stok Habis' : 'Pesan Sekarang'}
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Order Modal */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        productImageUrl={product.image_url}
        storeContact={storeContact}
        paymentMode={paymentMode}
        productPrice={product.current_price}
        flashSalePrice={flashSalePrice}
        userId={userId}
        availableStock={inventoryStock}
        productWeight={product.weight || 0}
        originVillageCode={product.origin_village_code}
      />
    </>
  );
}
