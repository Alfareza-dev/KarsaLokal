"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, GripVertical, AlertTriangle, X, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/admin/EmptyState";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newCat, setNewCat] = useState({ name: "", emoji: "" });
  const [editingCat, setEditingCat] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (data) setCategories(data);
    setIsLoading(false);
  };

  const toggleCategoryStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      setCategories(categories.map(c => 
        c.id === id ? { ...c, is_active: !currentStatus } : c
      ));
    }
  };

  const syncOrderToDB = () => {
    setCategories((currentCats) => {
      const doUpdate = async (cats: any[]) => {
        setIsReordering(true);
        const updates = cats.map((c, index) =>
          supabase.from('categories').update({ order_index: index + 1 }).eq('id', c.id)
        );
        await Promise.all(updates);
        setIsReordering(false);
        toast.success("Urutan berhasil disimpan! ");
      };
      doUpdate(currentCats);
      return currentCats;
    });
  };

  const handleAddCategory = async () => {
    if (!newCat.name || !newCat.emoji) {
      toast.error("Lengkapi semua kolom: Nama dan Emoji.");
      return;
    }

    // Auto-calculate order_index (place at the end)
    const nextOrderIndex = categories.length > 0 
      ? Math.max(...categories.map(c => c.order_index || 0)) + 1 
      : 1;
    const id = newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          id,
          name: newCat.name,
          emoji: newCat.emoji,
          order_index: nextOrderIndex,
          is_active: true
        }])
        .select();

      if (error) {
        console.error("[Categories] Insert error:", error);
        toast.error(`Gagal menambahkan kategori: ${error.message}`);
        return;
      }

      if (data) {
        setCategories([...categories, data[0]].sort((a, b) => a.order_index - b.order_index));
        setNewCat({ name: "", emoji: "" });
        toast.success("Kategori berhasil ditambahkan! ️");
      }
    } catch (err: any) {
      console.error("[Categories] Unexpected error on insert:", err);
      toast.error("Terjadi kesalahan: " + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      // Guard: check if category has products
      const { count, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id);

      if (countError) {
        toast.error("Gagal memeriksa produk dalam kategori.");
        return;
      }

      if (count && count > 0) {
        toast.error(`Kategori "${name}" masih memiliki ${count} produk. Pindahkan atau hapus produk terlebih dahulu.`);
        setConfirmDeleteId(null);
        return;
      }

      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        toast.error(`Gagal menghapus kategori: ${error.message}`);
      } else {
        setCategories(categories.filter(c => c.id !== id));
        setConfirmDeleteId(null);
        toast.success(`Kategori "${name}" dihapus! ️`);
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan: " + (err?.message || String(err)));
    }
  };

  const handleEditSave = async () => {
    if (!editingCat) return;
    if (!editingCat.name || !editingCat.emoji) {
      toast.error("Lengkapi semua kolom.");
      return;
    }
    setIsSavingEdit(true);
    const { error } = await supabase
      .from('categories')
      .update({
        name: editingCat.name,
        emoji: editingCat.emoji,
      })
      .eq('id', editingCat.id);

    if (error) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } else {
      setCategories(prev => prev.map(c =>
        c.id === editingCat.id ? { ...c, name: editingCat.name, emoji: editingCat.emoji } : c
      ));
      setEditingCat(null);
      toast.success("Kategori berhasil diperbarui! ️");
    }
    setIsSavingEdit(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Kategori Produk</h1>
          <p className="text-zinc-500 text-sm mt-1">Atur pengelompokan produk di etalase Anda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main List */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-50 rounded-[24px] border border-zinc-200 shadow-none overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-200 bg-gray-50/50">
              <h2 className="text-sm font-bold text-zinc-950">Daftar Kategori ({categories.length})</h2>
            </div>

            <Reorder.Group axis="y" values={categories} onReorder={setCategories} className="flex flex-col">
              {categories.map((category, idx) => {
                const isEditing = editingCat?.id === category.id;
                const isActive = category.is_active;
                return (
                <Reorder.Item 
                  value={category}
                  key={category.id} 
                  onDragEnd={syncOrderToDB}
                  className={`flex items-center justify-between p-4 ${idx !== categories.length - 1 ? 'border-b border-zinc-200' : ''} hover:bg-white/30 transition-colors group bg-zinc-50`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1 text-gray-300 hover:text-zinc-950 cursor-grab active:cursor-grabbing transition-colors" title="Drag to reorder">
                      <GripVertical size={16} />
                    </div>
                    
                    {isEditing && editingCat ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0" onPointerDown={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingCat.emoji}
                          onChange={(e) => setEditingCat({...editingCat, emoji: e.target.value})}
                          className="w-12 h-10 bg-white border border-zinc-200 rounded-xl text-xl text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <input
                          type="text"
                          value={editingCat.name}
                          onChange={(e) => setEditingCat({...editingCat, name: e.target.value})}
                          className="flex-1 min-w-0 px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 text-zinc-950"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-none">
                          {category.emoji}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-950">{category.name}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={category.is_active} 
                        onChange={() => toggleCategoryStatus(category.id, category.is_active)} 
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleEditSave}
                            disabled={isSavingEdit}
                            className="px-3 py-1.5 bg-white text-white text-xs font-bold rounded-lg hover:bg-white-hover transition-colors disabled:opacity-60"
                          >
                            {isSavingEdit ? '...' : 'Simpan'}
                          </button>
                          <button
                            onClick={() => setEditingCat(null)}
                            className="p-1.5 text-zinc-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            if (isActive) {
                              toast.error("Gunakan tombol switch (sebelah kiri) untuk menonaktifkan terlebih dahulu.");
                              return;
                            }
                            setEditingCat({
                              id: category.id,
                              name: category.name,
                              emoji: category.emoji,
                            });
                          }}
                          disabled={isActive}
                          className={`p-2 rounded-xl transition-colors ${isActive ? 'text-gray-200 cursor-not-allowed' : 'text-zinc-500 hover:text-blue-500 hover:bg-blue-50'}`}
                          title={isActive ? "Matikan switch untuk mengedit" : "Edit"}
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      <AnimatePresence mode="wait">
                        {confirmDeleteId === category.id ? (
                          <motion.div key="confirm" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-1">
                            <button onClick={() => handleDelete(category.id, category.name)} className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">
                              <AlertTriangle size={12} /> Hapus
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-zinc-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                              <X size={14} />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="trash"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                              if (isActive) {
                                toast.error("Gunakan tombol switch (sebelah kiri) untuk menonaktifkan terlebih dahulu.");
                                return;
                              }
                              setConfirmDeleteId(category.id);
                            }}
                            disabled={isActive}
                            className={`p-2 rounded-xl transition-colors ${isActive ? 'text-gray-200 cursor-not-allowed' : 'text-zinc-500 hover:text-red-500 hover:bg-red-50'}`}
                            title={isActive ? "Matikan switch untuk menghapus" : "Hapus"}
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Reorder.Item>
                );
              })}
            </Reorder.Group>
            {categories.length === 0 && !isLoading && (
              <EmptyState
                emoji="️"
                title="Belum ada kategori nih..."
                description="Tambah kategori pertama menggunakan form di samping! "
              />
            )}
          </motion.div>

          {/* Info banner */}
          <div className="mt-4 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
            <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Proteksi Kategori:</strong> Kategori yang berstatus <strong>Aktif</strong> tidak dapat diedit atau dihapus. Nonaktifkan terlebih dahulu melalui toggle di sebelah kiri. Kategori yang masih memiliki produk juga tidak dapat dihapus.
            </p>
          </div>
        </div>

        {/* Quick Add Form (Sidebar) */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none sticky top-24"
          >
            <h2 className="text-lg font-bold text-zinc-950 mb-5">Tambah Cepat</h2>
            
            <form className="flex flex-col gap-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-sm font-semibold text-zinc-950 mb-2">Nama Kategori</label>
                  <input
                    type="text"
                    value={newCat.name}
                    onChange={(e) => setNewCat({...newCat, name: e.target.value})}
                    placeholder="Contoh: Kuliner Lokal"
                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-zinc-950 mb-2 text-center">Icon</label>
                  <input
                    type="text"
                    value={newCat.emoji}
                    onChange={(e) => setNewCat({...newCat, emoji: e.target.value})}
                    placeholder=""
                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950 text-center"
                  />
                </div>
              </div>

              <button 
                type="button"
                onClick={handleAddCategory}
                disabled={isSaving}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-bold transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {isSaving ? "Menyimpan..." : "Simpan Kategori"}
              </button>
            </form>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
