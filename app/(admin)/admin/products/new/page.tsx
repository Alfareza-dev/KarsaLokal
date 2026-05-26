"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Plus, Trash2, Save, Sparkles, ArrowLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { VillageSelect } from "@/components/shared/VillageSelect";

export default function AdminAddProductPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    category: "",
    normalPrice: "",
    currentPrice: "",
    description: "",
    isTerlaris: false,
    isBaru: false,
    isActive: true,
    weight: "",
    dimensions: "",
    originVillageCode: "",
    stock: "0",
  });

  const [imageUrl, setImageUrl] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  // Quick Add Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", emoji: "" });
  const [isSavingCat, setIsSavingCat] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name').order('order_index', { ascending: true });
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // FAQ State
  const [faqs, setFaqs] = useState([{ question: "", answer: "" }]);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name) {
      const generatedSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    } else {
      setFormData(prev => ({ ...prev, slug: "" }));
    }
  }, [formData.name]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === "slug") {
      // Enforce slug format: only lowercase letters, digits, hyphens
      const sanitised = value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-{2,}/g, "-");
      setFormData(prev => ({ ...prev, slug: sanitised }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFaqChange = (index: number, field: "question" | "answer", value: string) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
    setFaqs(newFaqs);
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    if (faqs.length > 1) {
      setFaqs(faqs.filter((_, i) => i !== index));
    }
  };

  const handleQuickAddCategory = async () => {
    if (!newCat.name || !newCat.emoji) {
      toast.error("Lengkapi semua kolom: Nama dan Emoji.");
      return;
    }
    const id = newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    setIsSavingCat(true);
    
    // Get max order_index for auto-ordering
    const { data: maxOrderData } = await supabase
      .from('categories')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1);
    
    const nextOrder = maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].order_index || 0) + 1 : 1;

    const { data, error } = await supabase
      .from('categories')
      .insert([{
        id,
        name: newCat.name,
        emoji: newCat.emoji,
        order_index: nextOrder,
        is_active: true,
      }])
      .select();

    if (error) {
      toast.error(`Gagal menambahkan kategori: ${error.message}`);
    } else if (data && data[0]) {
      setCategories(prev => [...prev, data[0]].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
      // Auto-select the newly created category
      setFormData(prev => ({ ...prev, category: data[0].id }));
      setNewCat({ name: "", emoji: "" });
      setShowCategoryModal(false);
      toast.success("Kategori berhasil ditambahkan! ️");
    }
    setIsSavingCat(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.category || !formData.currentPrice) {
      toast.error("Mohon lengkapi data wajib (Nama, Slug, Kategori, Harga Jual)");
      return;
    }

    if (parseFloat(formData.currentPrice) > parseFloat(formData.normalPrice)) {
      toast.error("Harga Jual tidak boleh lebih besar dari Harga Asli!");
      return;
    }
    
    setIsSaving(true);
    
    // Status default: ready
    const status = "ready";

    const productDataToInsert = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      normal_price: parseFloat(formData.normalPrice) || 0,
      current_price: parseFloat(formData.currentPrice) || 0,
      category_id: formData.category,
      image_url: imageUrl || null,
      faq: faqs,
      is_best_seller: formData.isTerlaris,
      is_new: formData.isBaru,
      status,
      is_active: formData.isActive,
      weight: parseFloat(formData.weight) || 0,
      dimensions: formData.dimensions || null,
      origin_village_code: formData.originVillageCode || null,
      stock: parseInt(formData.stock) || 0,
    };

    try {
      const { error } = await supabase.from('products').insert(productDataToInsert);

      if (error) {
        console.error("[Products] Insert error:", error);
        if (error.code === '23505') {
          toast.error("Gagal: Slug URL sudah digunakan. Silakan gunakan slug yang berbeda.");
        } else {
          toast.error(`Gagal menyimpan produk: ${error.message}`);
        }
      } else {
        toast.success("Produk baru berhasil ditambahkan! ");
        router.refresh();
        router.push("/admin/products");
      }
    } catch (err: any) {
      console.error("[Products] Unexpected error on insert:", err);
      toast.error("Terjadi kesalahan tidak terduga: " + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-950 hover:border-zinc-200 hover:bg-white transition-all shadow-none"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Tambah Produk</h1>
            <p className="text-zinc-500 text-sm mt-1">Buat produk digital baru di katalog Anda</p>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="hidden sm:flex items-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-xl font-bold shadow-none transition-all"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={18} />
              Simpan Produk
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">
        
        {/* Kolom Utama (Kiri) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Informasi Dasar */}
          <div className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none">
            <h2 className="text-lg font-bold text-zinc-950 mb-5 flex items-center gap-2">
              <Sparkles size={20} className="text-zinc-950" />
              Informasi Dasar
            </h2>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Nama Produk *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Contoh: Netflix Premium 1 Bulan"
                  className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Slug URL *</label>
                <div className="flex items-center">
                  <span className="px-4 py-3 bg-white border border-r-0 border-zinc-200 rounded-l-xl text-zinc-500 text-sm">
                    /product/
                  </span>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="netflix-premium-1-bulan"
                    pattern="[a-z0-9-]+"
                    title="Hanya huruf kecil, angka, dan tanda hubung (-)"
                    className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">Hanya huruf kecil, angka, dan tanda hubung (-)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Deskripsi Produk *</label>
                <textarea
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Jelaskan detail fitur produk Anda di sini..."
                  className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pengiriman Fisik */}
          <div className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none">
            <h2 className="text-lg font-bold text-zinc-950 mb-5">Pengiriman Fisik (UMKM)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Berat (Gram) *</label>
                <input
                  type="number"
                  name="weight"
                  required
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="Contoh: 1200 (untuk 1.2kg)"
                  className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Dimensi (P x L x T)</label>
                <input
                  type="text"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleInputChange}
                  placeholder="Contoh: 20x10x5 cm"
                  className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Stok *</label>
                <input
                  type="number"
                  name="stock"
                  required
                  value={formData.stock}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                />
              </div>
            </div>
            <VillageSelect 
              value={formData.originVillageCode} 
              onChange={(code) => setFormData(prev => ({ ...prev, originVillageCode: code }))} 
              label="Kecamatan/Desa Asal Pengiriman *" 
            />
          </div>

          {/* Pricing */}
          <div className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none">
            <h2 className="text-lg font-bold text-zinc-950 mb-5">Harga</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Harga Jual (Current) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">Rp</span>
                  <input
                    type="number"
                    name="currentPrice"
                    value={formData.currentPrice}
                    onChange={handleInputChange}
                    placeholder="25000"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Harga Asli (Normal)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">Rp</span>
                  <input
                    type="number"
                    name="normalPrice"
                    value={formData.normalPrice}
                    onChange={handleInputChange}
                    placeholder="45000"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Editor */}
          <div className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-zinc-950">Pertanyaan Umum (FAQ)</h2>
              <button
                type="button"
                onClick={addFaq}
                className="flex items-center gap-1 text-sm font-bold text-zinc-950 hover:text-zinc-950-hover transition-colors bg-white px-3 py-1.5 rounded-lg"
              >
                <Plus size={16} /> Tambah
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {faqs.map((faq, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-3 items-start"
                  >
                    <div className="flex-1 bg-white p-4 rounded-xl border border-zinc-200 flex flex-col gap-3">
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleFaqChange(index, "question", e.target.value)}
                        placeholder={`Pertanyaan ${index + 1}`}
                        className="w-full bg-transparent border-b border-zinc-200 pb-2 text-sm font-bold text-zinc-950 focus:outline-none focus:border-zinc-300"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(index, "answer", e.target.value)}
                        placeholder={`Jawaban ${index + 1}`}
                        rows={2}
                        className="w-full bg-transparent text-sm text-zinc-500 focus:outline-none resize-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFaq(index)}
                      disabled={faqs.length === 1}
                      className="p-3 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* Sidebar Kanan (Pengaturan Gambar & Kategori) */}
        <div className="flex flex-col gap-6">
          
          {/* Gambar Produk */}
          <div className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none">
            <h2 className="text-lg font-bold text-zinc-950 mb-4">Gambar Produk</h2>
            <ImageUploader 
              bucket="product-images"
              folder="products" 
              currentImageUrl={imageUrl || null}
              onUploadSuccess={setImageUrl} 
              onRemove={() => setImageUrl("")}
            />
          </div>

          {/* Pengaturan Status */}
          <div className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 shadow-none">
            <h2 className="text-lg font-bold text-zinc-950 mb-4">Pengaturan</h2>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-950 mb-2">Kategori</label>
                <div className="flex items-center gap-2">
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950 appearance-none"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="w-10 h-10 flex items-center justify-center bg-white text-zinc-950 hover:bg-white hover:text-zinc-950-hover rounded-xl transition-colors shrink-0 border border-zinc-200"
                    title="Tambah Kategori Baru"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <hr className="border-zinc-200" />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Publikasikan</h3>
                  <p className="text-xs text-zinc-500">OFF = Draft (tidak tampil di publik)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Status &quot;Terlaris&quot;</h3>
                  <p className="text-xs text-zinc-500">Tampilkan badge khusus</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="isTerlaris" checked={formData.isTerlaris} onChange={handleInputChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Status &quot;Baru&quot;</h3>
                  <p className="text-xs text-zinc-500">Tampilkan label new</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="isBaru" checked={formData.isBaru} onChange={handleInputChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Sticky Action */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-zinc-50 border-t border-zinc-200 sm:hidden z-40">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full flex justify-center items-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-6 py-3.5 rounded-xl font-bold shadow-none transition-all"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={18} />
              Simpan Produk
            </>
          )}
        </button>
      </div>

      {/* Quick Add Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/50 backdrop-blur-sm"
              onClick={() => setShowCategoryModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-zinc-50 rounded-3xl p-6 shadow-2xl z-10 w-full max-w-sm"
            >
              <button
                onClick={() => setShowCategoryModal(false)}
                className="absolute top-4 right-4 p-2 bg-white text-zinc-500 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
              <h3 className="text-lg font-bold text-zinc-950 mb-4">Tambah Kategori Baru ️</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-950 mb-1.5">Nama Kategori</label>
                  <input
                    type="text"
                    value={newCat.name}
                    onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                    placeholder="Contoh: Kuliner Lokal"
                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-950 mb-1.5">Icon Emoji</label>
                    <input
                      type="text"
                      value={newCat.emoji}
                      onChange={(e) => setNewCat({ ...newCat, emoji: e.target.value })}
                      placeholder=""
                      className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-zinc-300 transition-all text-zinc-950 text-center"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickAddCategory}
                  disabled={isSavingCat}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSavingCat ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {isSavingCat ? "Menyimpan..." : "Simpan Kategori"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
