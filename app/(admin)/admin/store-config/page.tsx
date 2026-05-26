"use client";

import { useState, useEffect } from "react";
import { Save, Store, BellRing, Link as LinkIcon, Image as ImageIcon, Sparkles, AlertCircle, RotateCcw, Clock, UploadCloud, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { THEMES, getThemeConfig, DEFAULT_THEME_KEY } from "@/lib/themes";
import { revalidateStoreConfig, setBrandingCookie } from "@/app/actions";

export default function AdminStoreConfigPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Store Settings
  const [storeConfig, setStoreConfig] = useState({
    storeName: "Katalog Digital",
    metaDescription: "Tempat terpercaya untuk layanan digital premium.",
    paymentMode: "manual" as "manual" | "gateway",
  });

  // Store Contacts
  const [contacts, setContacts] = useState({
    whatsapp: "6281234567890",
    instagram: "username_ig",
    telegram: "username_tg",
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('store_configs')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (data) {
      setStoreConfig({
        storeName: data.name || "",
        metaDescription: data.tagline || "",
        paymentMode: data.payment_mode || "manual",
      });
      
      setContacts({
        whatsapp: data.contact_whatsapp || "",
        instagram: data.contact_instagram || "",
        telegram: data.contact_telegram || "",
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const { error } = await supabase
      .from('store_configs')
      .upsert({
        id: 1,
        name: storeConfig.storeName,
        tagline: storeConfig.metaDescription,
        payment_mode: storeConfig.paymentMode,
        contact_whatsapp: contacts.whatsapp,
        contact_instagram: contacts.instagram,
        contact_telegram: contacts.telegram,
      });
    
    if (error) {
      toast.error("Gagal menyimpan konfigurasi: " + error.message);
    } else {
      toast.success("Pengaturan toko berhasil disimpan!");
      
      // ── Sync branding cookie agar reload langsung tampilkan data terbaru ──
      await setBrandingCookie({
        name: storeConfig.storeName,
      });
      
      await revalidateStoreConfig();
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Pengaturan Toko</h1>
          <p className="text-zinc-500 text-sm mt-1">Konfigurasi identitas, kontak, dan popup website</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 text-white px-6 py-2.5 rounded-xl font-bold shadow-none transition-all shrink-0"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={18} />
              Simpan Pengaturan
            </>
          )}
        </button>
      </div>

      <div className="max-w-4xl flex flex-col gap-8">
        
        {/* Forms */}
        <div className="flex flex-col gap-8">


          {/* Section 2: Store Contacts */}
          <section className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none">
            <h2 className="text-lg font-bold text-zinc-950 mb-5 flex items-center gap-2">
              <LinkIcon size={20} className="text-zinc-950" />
              Kontak Toko & Sosial Media
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-1.5">Nomor WhatsApp</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium text-sm">+</span>
                  <input
                    type="text"
                    value={contacts.whatsapp}
                    onChange={(e) => setContacts({...contacts, whatsapp: e.target.value})}
                    placeholder="628..."
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">Gunakan kode negara tanpa tanda +</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-1.5">Username Instagram</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium text-sm">@</span>
                  <input
                    type="text"
                    value={contacts.instagram}
                    onChange={(e) => setContacts({...contacts, instagram: e.target.value})}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-1.5">Username Telegram</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium text-sm">@</span>
                  <input
                    type="text"
                    value={contacts.telegram}
                    onChange={(e) => setContacts({...contacts, telegram: e.target.value})}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Store Identity & Theme */}
          <section className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none">
            <h2 className="text-lg font-bold text-zinc-950 mb-5 flex items-center gap-2">
              <Store size={20} className="text-zinc-950" />
              Identitas & Tema Toko
            </h2>
            
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-zinc-950 mb-1.5">Nama Toko (Brand)</label>
                  <input
                    type="text"
                    value={storeConfig.storeName}
                    onChange={(e) => setStoreConfig({...storeConfig, storeName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-1.5">Meta Description (SEO)</label>
                <textarea
                  value={storeConfig.metaDescription}
                  onChange={(e) => setStoreConfig({...storeConfig, metaDescription: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950 resize-none"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Mode Toko (Pembayaran & Stok) */}
          <section className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none">
            <h2 className="text-lg font-bold text-zinc-950 mb-5 flex items-center gap-2">
              <Sparkles size={20} className="text-zinc-950" />
              Mode Toko & Manajemen Stok
            </h2>
            
            <div className="flex flex-col gap-5">
              <div className="p-4 bg-white border border-zinc-200 rounded-xl flex gap-4">
                <AlertCircle className="text-zinc-950 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-zinc-950">
                  <p className="font-semibold text-gray-900 mb-1">Perbedaan Mode:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Manual:</strong> Stok dikelola lewat dropdown status produk (Ready / Habis).</li>
                    <li><strong>Payment Gateway:</strong> Stok dihitung otomatis real-time dari tabel inventory digital.</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Pilih Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`relative flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${storeConfig.paymentMode === 'manual' ? 'border-zinc-300 bg-white/5' : 'border-zinc-200 bg-zinc-50 hover:border-gray-300'}`}>
                    <input 
                      type="radio" 
                      name="paymentMode" 
                      value="manual"
                      checked={storeConfig.paymentMode === 'manual'}
                      onChange={() => setStoreConfig({...storeConfig, paymentMode: 'manual'})}
                      className="w-5 h-5 text-zinc-950 focus:ring-primary border-zinc-300 rounded-full"
                    />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Mode Manual</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Konfirmasi manual</p>
                    </div>
                  </label>

                  <label className={`relative flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${storeConfig.paymentMode === 'gateway' ? 'border-zinc-300 bg-white/5' : 'border-zinc-200 bg-zinc-50 hover:border-gray-300'}`}>
                    <input 
                      type="radio" 
                      name="paymentMode" 
                      value="gateway"
                      checked={storeConfig.paymentMode === 'gateway'}
                      onChange={() => setStoreConfig({...storeConfig, paymentMode: 'gateway'})}
                      className="w-5 h-5 text-zinc-950 focus:ring-primary border-zinc-300 rounded-full"
                    />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Payment Gateway</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Otomatisasi dengan stok digital</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile Sticky Action */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-zinc-50 border-t border-zinc-200 lg:hidden z-40">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-primary to-primary-hover text-white px-6 py-3.5 rounded-xl font-bold shadow-none transition-all"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={18} />
              Simpan Pengaturan
            </>
          )}
        </button>
      </div>
    </div>
  );
}
