"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, AlertTriangle, X, Image as ImageIcon, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('products').select('*, category:categories(name)').order('created_at', { ascending: false });
    
    if (data) {
      setProducts(data);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: number, name: string, imageUrl?: string) => {
    try {
      // Remove image from product-images bucket
      if (imageUrl) {
        const match = imageUrl.match(/\/object\/public\/product-images\/(.+)$/);
        const storagePath = match ? match[1] : null;
        if (storagePath) {
          const { error: storageErr } = await supabase.storage.from("product-images").remove([storagePath]);
          if (storageErr) console.error("[Products] Storage remove error:", storageErr);
        }
      }

      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        console.error("[Products] Delete error:", error);
        toast.error(`Gagal menghapus produk: ${error.message}`);
      } else {
        setProducts(products.filter((p) => p.id !== id));
        setConfirmDeleteId(null);
        toast.success(`Produk "${name}" berhasil dihapus! ️`);
      }
    } catch (err: any) {
      console.error("[Products] Unexpected delete error:", err);
      toast.error("Terjadi kesalahan tidak terduga: " + (err?.message || String(err)));
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Daftar Produk</h1>
          <p className="text-zinc-500 text-sm mt-1">Kelola semua produk fisik UMKM Anda</p>
        </div>
        
        <Link 
          href="/admin/products/new"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold shadow-none transition-all shrink-0"
        >
          <Plus size={18} />
          Tambah Produk
        </Link>
      </div>

      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-50 rounded-[24px] border border-zinc-200 shadow-none overflow-hidden flex flex-col"
      >
        {/* Toolbar */}
        <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
          {/* Search */}
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="Cari produk berdasarkan nama atau kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all text-zinc-950"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto text-sm text-zinc-500 font-medium">
            <span>Total:</span>
            <span className="bg-white text-zinc-950-hover px-2 py-0.5 rounded-lg">{filteredProducts.length}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-zinc-200">
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Produk</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kategori</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Harga</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Stok</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-white/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <div className="w-12 h-12 rounded-2xl shrink-0 shadow-none overflow-hidden relative bg-white border border-zinc-200">
                          <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="48px" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-2xl shrink-0 shadow-none flex items-center justify-center bg-white border border-zinc-200 text-zinc-500">
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-zinc-950 truncate leading-tight mb-1">{p.name}</span>
                        <span className="text-xs text-zinc-500 truncate">/{p.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex px-2 py-1 bg-white text-zinc-500 text-xs rounded-md font-medium">
                      {p.category?.name || "Tanpa Kategori"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-950">Rp {(p.current_price || 0).toLocaleString()}</span>
                      {p.normal_price > p.current_price && (
                        <span className="text-xs text-zinc-500 line-through">Rp {(p.normal_price || 0).toLocaleString()}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-lg font-extrabold ${p.stock === 0 ? 'text-red-500' : 'text-zinc-950'}`}>
                      {p.stock || 0}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {p.status === 'habis' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Habis
                      </span>
                    ) : p.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/admin/products/${p.id}/edit`}
                        className="p-2 text-zinc-500 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Edit Produk"
                      >
                        <Edit size={16} />
                      </Link>
                      <AnimatePresence mode="wait">
                        {confirmDeleteId === p.id ? (
                          <motion.div
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1"
                          >
                            <button
                              onClick={() => handleDelete(p.id, p.name, p.image_url)}
                              className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                            >
                              <AlertTriangle size={12} /> Hapus
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 text-zinc-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="trash"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmDeleteId(p.id)}
                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Hapus Produk"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </tr>
              ))}
              
              {products.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      emoji=""
                      title="Wah, belum ada produk nih..."
                      description="Yuk tambah produk pertama Anda sekarang! "
                    />
                  </td>
                </tr>
              )}
              {products.length > 0 && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      emoji=""
                      title="Produk tidak ditemukan"
                      description="Coba sesuaikan kata kunci pencarian Anda."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
