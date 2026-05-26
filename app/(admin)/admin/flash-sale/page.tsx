"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, Edit, Trash2, Calendar, Clock, Search, Zap, AlertTriangle, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminFlashSalePage() {
  const [flashSales, setFlashSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingFs, setEditingFs] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    sale_price: "",
    start_at: "",
    end_at: "",
    is_active: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: fsData } = await supabase
      .from('flash_sales')
      .select('*, product:products(id, name, image_url, current_price, status, emoji, gradient_from, gradient_to)')
      .order('created_at', { ascending: false });
    const { data: pData } = await supabase.from('products').select('*');
    
    if (fsData) setFlashSales(fsData);
    if (pData) setProducts(pData);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({ product_id: "", sale_price: "", start_at: "", end_at: "", is_active: true });
    setIsAdding(false);
    setEditingFs(null);
  };

  const toLocalDatetime = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const startEditing = (fs: any) => {
    setEditingFs(fs);
    setIsAdding(true);
    setFormData({
      product_id: String(fs.product_id),
      sale_price: String(fs.sale_price),
      start_at: toLocalDatetime(fs.start_at),
      end_at: toLocalDatetime(fs.end_at),
      is_active: fs.is_active,
    });
  };

  const toggleFlashSaleStatus = async (id: number, currentStatus: boolean) => {
    // If activating, check if the product is not habis
    if (!currentStatus) {
      const fs = flashSales.find(f => f.id === id);
      const product = fs?.product || products.find(p => p.id === fs?.product_id);
      if (product?.status === 'habis') {
        toast.error('Tidak bisa mengaktifkan flash sale untuk produk yang stoknya habis! ');
        return;
      }
    }

    const { error } = await supabase
      .from('flash_sales')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      setFlashSales(flashSales.map(fs => 
        fs.id === id ? { ...fs, is_active: !currentStatus } : fs
      ));
    }
  };

  const removeFlashSale = async (id: number) => {
    try {
      const { error } = await supabase.from('flash_sales').delete().eq('id', id);
      if (!error) {
        setFlashSales(flashSales.filter(fs => fs.id !== id));
        setConfirmDeleteId(null);
        toast.success("Flash sale berhasil dihapus! ️");
      } else {
        toast.error("Gagal menghapus flash sale: " + error.message);
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan: " + (err?.message || String(err)));
    }
  };

  const handleRecreateFlashSale = (fs: any) => {
    setFormData({
      product_id: fs.product_id.toString(),
      sale_price: fs.sale_price.toString(),
      start_at: "",
      end_at: "",
      is_active: true
    });
    setEditingFs(null);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info("Silakan tentukan jadwal baru untuk promo ini.");
  };

  const validateForm = (): boolean => {
    if (!formData.product_id || !formData.sale_price || !formData.start_at || !formData.end_at) {
      toast.error("Lengkapi semua field!");
      return false;
    }

    // Block if product is habis
    const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));
    if (selectedProduct?.status === 'habis') {
      toast.error('Tidak bisa membuat flash sale untuk produk yang stoknya habis! ');
      return false;
    }

    // Price validation: sale price must be less than normal price
    const salePrice = parseInt(formData.sale_price);
    const normalPrice = selectedProduct?.current_price || 0;
    if (salePrice >= normalPrice) {
      toast.error(`Harga flash sale harus lebih murah dari harga jual normal (Rp ${normalPrice.toLocaleString()})!`);
      return false;
    }

    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingFs) {
      // Deactivate other active flash sales for this product to prevent duplicates
      if (formData.is_active) {
         await supabase.from('flash_sales').update({ is_active: false }).eq('product_id', parseInt(formData.product_id)).neq('id', editingFs.id);
      }

      // UPDATE existing flash sale
      const { data, error } = await supabase
        .from('flash_sales')
        .update({
          product_id: parseInt(formData.product_id),
          sale_price: parseInt(formData.sale_price),
          start_at: new Date(formData.start_at).toISOString(),
          end_at: new Date(formData.end_at).toISOString(),
          is_active: formData.is_active,
        })
        .eq('id', editingFs.id)
        .select('*, product:products(id, name, image_url, current_price, status, emoji, gradient_from, gradient_to)')
        .single();

      if (!error && data) {
        // Update local state to deactivate others for the same product
        const updatedList = flashSales.map(fs => 
          fs.product_id === parseInt(formData.product_id) && fs.id !== editingFs.id && formData.is_active 
            ? { ...fs, is_active: false } 
            : fs
        );
        setFlashSales(updatedList.map(fs => fs.id === editingFs.id ? data : fs));
        resetForm();
        toast.success("Flash sale berhasil diperbarui! ️");
      } else {
        toast.error("Gagal memperbarui flash sale: " + error?.message);
      }
    } else {
      // Deactivate any existing active flash sales for this product to prevent duplicates
      if (formData.is_active) {
         await supabase.from('flash_sales').update({ is_active: false }).eq('product_id', parseInt(formData.product_id));
      }

      // INSERT new flash sale
      const { data, error } = await supabase
        .from('flash_sales')
        .insert([{
          product_id: parseInt(formData.product_id),
          sale_price: parseInt(formData.sale_price),
          start_at: new Date(formData.start_at).toISOString(),
          end_at: new Date(formData.end_at).toISOString(),
          is_active: formData.is_active
        }])
        .select('*, product:products(id, name, image_url, current_price, status, emoji, gradient_from, gradient_to)')
        .single();

      if (!error && data) {
        // Update local state to deactivate old ones
        const updatedList = flashSales.map(fs => 
          fs.product_id === parseInt(formData.product_id) && formData.is_active 
            ? { ...fs, is_active: false } 
            : fs
        );
        setFlashSales([data, ...updatedList]);
        resetForm();
        toast.success("Flash sale baru berhasil dibuat! ");
      } else {
        toast.error("Gagal menyimpan flash sale: " + error?.message);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Flash Sale & Promo</h1>
          <p className="text-zinc-500 text-sm mt-1">Atur jadwal diskon kilat untuk produk Anda</p>
        </div>
        
        <button 
          onClick={() => {
            if (isAdding) {
              resetForm();
            } else {
              setIsAdding(true);
              setEditingFs(null);
              setFormData({ product_id: "", sale_price: "", start_at: "", end_at: "", is_active: true });
            }
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold shadow-none transition-all shrink-0"
        >
          <Plus size={18} />
          {isAdding ? "Batal" : "Tambah Promo Baru"}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none mb-6">
              <h2 className="text-lg font-bold text-zinc-950 mb-4">
                {editingFs ? "️ Edit Flash Sale" : "Buat Flash Sale Baru"}
              </h2>
              <form onSubmit={handleFormSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-zinc-950 mb-2">Produk</label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Pilih Produk</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Rp {p.current_price?.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-zinc-950 mb-2">Harga Sale (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.sale_price}
                    onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-zinc-950 mb-2">Mulai</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_at}
                    onChange={(e) => setFormData({...formData, start_at: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-zinc-950 mb-2">Berakhir</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_at}
                    onChange={(e) => setFormData({...formData, end_at: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="md:col-span-1">
                  <button type="submit" className="w-full bg-white hover:bg-white-hover text-white font-bold py-2.5 px-4 rounded-xl transition-colors">
                    {editingFs ? "Update" : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-50 rounded-[24px] border border-zinc-200 shadow-none overflow-hidden flex flex-col"
      >
        {/* Toolbar */}
        <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="Cari promo flash sale..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-300/50 focus:ring-2 focus:ring-primary/10 transition-all text-zinc-950"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-zinc-200">
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Target Produk</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Harga Sale</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Jadwal Pelaksanaan</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                const filteredFlashSales = flashSales.filter(fs => 
                  fs.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (filteredFlashSales.length === 0 && searchQuery) {
                  return (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          emoji=""
                          title="Promo tidak ditemukan..."
                          description={`Tidak ada produk dengan nama "${searchQuery}" di daftar flash sale.`}
                        />
                      </td>
                    </tr>
                  );
                }

                if (filteredFlashSales.length === 0 && !isLoading) {
                  return (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          emoji=""
                          title="Belum ada Flash Sale aktif nih..."
                          description="Buat promo diskon kilat untuk meningkatkan penjualan! "
                        />
                      </td>
                    </tr>
                  );
                }

                return filteredFlashSales.map((fs, index) => {
                  const isExpired = new Date(fs.end_at) < new Date();
                  const rawImageUrl = fs.product?.image_url;
                  const imageUrl = rawImageUrl?.startsWith('http') 
                    ? rawImageUrl 
                    : rawImageUrl 
                      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${rawImageUrl}`
                      : null;

                  return (
                  <tr key={fs.id} className={`transition-colors group ${isExpired ? 'opacity-50 bg-gray-50/50' : 'hover:bg-white/30'}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {imageUrl ? (
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-none border border-zinc-200">
                            <Image 
                              src={imageUrl} 
                              alt={fs.product?.name || 'Product'} 
                              fill 
                              className="object-cover"
                              sizes="40px"
                              loading={index === 0 ? "eager" : "lazy"}
                              priority={index === 0}
                            />
                          </div>
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-none"
                            style={{ background: `linear-gradient(135deg, ${fs.product?.gradient_from || '#f472b6'} 0%, ${fs.product?.gradient_to || '#ec4899'} 100%)` }}
                          >
                            {fs.product?.emoji || ''}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-zinc-950 truncate leading-tight mb-0.5">{fs.product?.name}</span>
                          <span className="text-xs text-zinc-500 line-through">Rp {(fs.product?.current_price || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-extrabold text-zinc-950">Rp {(fs.sale_price || 0).toLocaleString()}</span>
                      <span className="text-xs font-medium text-zinc-950 bg-white w-max px-2 py-0.5 rounded-md mt-1">
                        Hemat Rp {((fs.product?.current_price || 0) - fs.sale_price).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar size={14} className="text-zinc-500" />
                        <span>Mulai: {new Date(fs.start_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock size={14} className="text-zinc-500" />
                        <span>Akhir: {new Date(fs.end_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {isExpired ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        Expired
                      </span>
                    ) : (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={fs.is_active} 
                          onChange={() => toggleFlashSaleStatus(fs.id, fs.is_active)} 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white"></div>
                      </label>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isExpired && (
                        <button 
                          onClick={() => handleRecreateFlashSale(fs)}
                          className="p-2 text-zinc-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                          title="Buat Ulang Promo"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                      {!isExpired && (
                        <button 
                          onClick={() => startEditing(fs)}
                          className="p-2 text-zinc-500 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      <AnimatePresence mode="wait">
                        {confirmDeleteId === fs.id ? (
                          <motion.div key="confirm" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-1">
                            <button onClick={() => removeFlashSale(fs.id)} className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">
                              <AlertTriangle size={12} /> Hapus
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-zinc-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                              <X size={14} />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDeleteId(fs.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 size={16} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </tr>
                );
              });
            })()}
          </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
