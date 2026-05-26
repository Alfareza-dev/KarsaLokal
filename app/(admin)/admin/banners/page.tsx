"use client";

import { useState, useEffect } from "react";
import { Plus, GripVertical, Trash2, AlertCircle, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (data) setBanners(data);
    setIsLoading(false);
  };

  const toggleBannerStatus = async (id: number, currentStatus: boolean, imageUrl?: string) => {
    if (!currentStatus) {
      if (!imageUrl) {
        toast.error("Silakan unggah gambar banner terlebih dahulu sebelum mengaktifkan.");
        return;
      }
      const activeCount = banners.filter(b => b.is_active).length;
      if (activeCount >= 3) {
        toast.error("Maksimal hanya 3 banner yang boleh aktif secara bersamaan.");
        return;
      }
    }

    const { error } = await supabase
      .from('banners')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      setBanners(banners.map(b => 
        b.id === id ? { ...b, is_active: !currentStatus } : b
      ));
    } else {
      toast.error("Gagal mengubah status: " + error.message);
    }
  };

  const syncOrderToDB = () => {
    setBanners((currentBanners) => {
      const doUpdate = async (banns: any[]) => {
        const updates = banns.map((b, index) =>
          supabase.from('banners').update({ order_index: index + 1 }).eq('id', b.id)
        );
        await Promise.all(updates);
        toast.success("Urutan banner berhasil disimpan! ");
      };
      doUpdate(currentBanners);
      return currentBanners;
    });
  };

  const addBanner = async () => {
    const newOrder = banners.length > 0 ? Math.max(...banners.map(b => b.order_index)) + 1 : 1;
    
    try {
      const { data, error } = await supabase
        .from('banners')
        .insert([{
          title: "",
          subtitle: "",
          image_url: "",
          order_index: newOrder,
          is_active: false
        }])
        .select();

      if (error) {
        console.error("[Banners] Insert error:", error);
        toast.error(`Gagal menambah banner: ${error.message}`);
        return;
      }

      if (data) {
        setBanners([...banners, data[0]]);
        toast.success("Banner baru berhasil ditambahkan! ️");
      }
    } catch (err: any) {
      console.error("[Banners] Unexpected error on insert:", err);
      toast.error("Terjadi kesalahan tidak terduga: " + (err?.message || String(err)));
    }
  };

  const updateBannerField = async (id: number, field: string, value: any) => {
    // Update local state immediately for responsiveness (optimistic update)
    setBanners(banners.map(b => b.id === id ? { ...b, [field]: value } : b));

    // For image updates, save immediately
    if (field === 'image_url') {
       await supabase.from('banners').update({ [field]: value }).eq('id', id);
    }
  };

  // We add a separate handleSave to debounce text input saves or we can just save on blur
  const handleBlur = async (id: number, field: string, value: any) => {
    try {
      const { error } = await supabase.from('banners').update({ [field]: value }).eq('id', id);
      if (error) {
        console.error(`[Banners] Update field '${field}' error:`, error);
      }
    } catch (err: any) {
      console.error("[Banners] Unexpected error on update:", err);
    }
  };

  const removeBanner = async (id: number, imageUrl?: string) => {
    try {
      if (imageUrl) {
        const match = imageUrl.match(/\/object\/public\/banner-images\/(.+)$/);
        const storagePath = match ? match[1] : null;
        if (storagePath) {
          const { error: storageError } = await supabase.storage.from('banner-images').remove([storagePath]);
          if (storageError) {
            console.error("[Banners] Storage remove error:", storageError);
          }
        }
      }

      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) {
        console.error("[Banners] Delete error:", error);
        toast.error(`Gagal menghapus banner: ${error.message}`);
      } else {
        setBanners(banners.filter(b => b.id !== id));
        setConfirmDeleteId(null);
        toast.success("Banner berhasil dihapus! ️");
      }
    } catch (err: any) {
      console.error("[Banners] Unexpected error on delete:", err);
      toast.error("Terjadi kesalahan tidak terduga: " + (err?.message || String(err)));
    }
  };

  const activeCount = banners.filter(b => b.is_active).length;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Banner Promo</h1>
          <p className="text-zinc-500 text-sm mt-1">Atur banner utama yang tampil di halaman depan (Maks. 3 Aktif)</p>
        </div>
      </div>

      {activeCount >= 3 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
          <AlertCircle size={18} className="shrink-0" />
          Anda telah mencapai batas maksimal 3 banner aktif. Banner lainnya harus berstatus draft.
        </div>
      )}

      {/* Banners Grid */}
      <Reorder.Group axis="y" values={banners} onReorder={setBanners} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <BannerItem 
            key={banner.id}
            banner={banner}
            syncOrderToDB={syncOrderToDB}
            removeBanner={removeBanner}
            updateBannerField={updateBannerField}
            handleBlur={handleBlur}
            toggleBannerStatus={toggleBannerStatus}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
          />
        ))}

        {/* Empty State Add Card */}
        <motion.div
          onClick={addBanner}
          className="rounded-[24px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-zinc-300/30 hover:bg-white/30 transition-colors min-h-[350px]"
        >
          <div className="w-12 h-12 bg-white text-zinc-950 rounded-full flex items-center justify-center">
            <Plus size={24} />
          </div>
          <div className="text-center px-4">
            <p className="text-sm font-bold text-zinc-950">Tambah Banner Baru</p>
            <p className="text-xs text-zinc-500 mt-1">Status default: Draft</p>
          </div>
        </motion.div>
      </Reorder.Group>

    </div>
  );
}

function BannerItem({
  banner,
  syncOrderToDB,
  removeBanner,
  updateBannerField,
  handleBlur,
  toggleBannerStatus,
  confirmDeleteId,
  setConfirmDeleteId
}: any) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={banner}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={syncOrderToDB}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-50 rounded-[24px] border border-zinc-200 shadow-none overflow-hidden flex flex-col group relative"
    >
      {/* Drag Handle & Order */}
      <div 
        className="absolute top-3 left-3 bg-zinc-50 backdrop-blur-sm p-1.5 rounded-lg text-zinc-500 flex items-center justify-center shadow-none z-10 cursor-grab active:cursor-grabbing hover:text-gray-700 hover:bg-white"
        onPointerDown={(e) => dragControls.start(e)}
        style={{ touchAction: "none" }}
      >
        <GripVertical size={16} />
      </div>

      {/* Delete Button */}
      <AnimatePresence mode="wait">
        {confirmDeleteId === banner.id ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-3 right-3 flex items-center gap-1 z-10"
          >
            <button
              onClick={() => removeBanner(banner.id, banner.image_url)}
              className="flex items-center gap-1 px-2 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors shadow-none"
            >
              <AlertTriangle size={12} /> Hapus
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="p-1.5 bg-zinc-50 backdrop-blur-sm text-zinc-500 hover:text-gray-700 rounded-lg shadow-none transition-colors"
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
            onClick={() => setConfirmDeleteId(banner.id)}
            className="absolute top-3 right-3 bg-zinc-50 backdrop-blur-sm p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 shadow-none z-10 transition-colors"
          >
            <Trash2 size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Image Preview / Upload Area */}
      <div className="border-b border-zinc-200">
        <ImageUploader
          bucket="banner-images"
          folder="banners"
          currentImageUrl={banner.image_url}
          aspectRatio="aspect-[2/1]"
          onUploadSuccess={(url) => updateBannerField(banner.id, 'image_url', url)}
          onRemove={() => updateBannerField(banner.id, 'image_url', "")}
        />
      </div>

      {/* Form Fields */}
      <div className="p-5 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-950 mb-1.5">Judul Overlay</label>
          <input
            type="text"
            value={banner.title || ""}
            onChange={(e) => updateBannerField(banner.id, 'title', e.target.value)}
            onBlur={(e) => handleBlur(banner.id, 'title', e.target.value)}
            placeholder="Promo Spesial"
            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-100 transition-all text-zinc-950"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-950 mb-1.5">Sub-judul Overlay</label>
          <input
            type="text"
            value={banner.subtitle || ""}
            onChange={(e) => updateBannerField(banner.id, 'subtitle', e.target.value)}
            onBlur={(e) => handleBlur(banner.id, 'subtitle', e.target.value)}
            placeholder="Dapatkan diskon sekarang"
            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-100 transition-all text-zinc-950"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 mt-1">
          <span className="text-sm font-semibold text-zinc-950">Status Aktif</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={banner.is_active} 
              onChange={() => toggleBannerStatus(banner.id, banner.is_active, banner.image_url)} 
              disabled={!banner.image_url}
            />
            <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${banner.image_url ? 'peer-checked:bg-white' : 'opacity-50 cursor-not-allowed'}`}></div>
          </label>
        </div>
      </div>
    </Reorder.Item>
  );
}
