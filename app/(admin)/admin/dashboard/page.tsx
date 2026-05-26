"use client";

import { useState, useEffect, useMemo } from "react";
import { Package, FileEdit, Zap, Tags, Search, ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown, Sparkles, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";

type SortField = "views" | "clicks" | "conversion";
type SortDir = "asc" | "desc";

export default function AdminDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statsData, setStatsData] = useState({
    products: 0,
    drafts: 0,
    flashSales: 0,
    categories: 0,
    outOfStock: 0
  });
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("clicks");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [paymentMode, setPaymentMode] = useState<"manual" | "gateway">("manual");

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      const [
        { data: config },
        { count: totalProducts, data: allProducts },
        { count: drafts },
        { count: flashSales },
        { count: totalCategories, data: allCategories },
        { data: inventoryData }
      ] = await Promise.all([
        supabase.from('store_configs').select('payment_mode').eq('id', 1).single(),
        supabase.from('products').select('*', { count: 'exact' }),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', false),
        supabase.from('flash_sales').select('*', { count: 'exact', head: true }).eq('is_active', true).gt('end_at', new Date().toISOString()),
        supabase.from('categories').select('*', { count: 'exact' }),
        supabase.from('inventory').select('product_id').eq('is_sold', false)
      ]);

      const mode = config?.payment_mode || 'manual';
      setPaymentMode(mode);

      // Build stock map for gateway mode
      const stockMap: Record<number, number> = {};
      if (mode === 'gateway' && inventoryData) {
        inventoryData.forEach((inv: any) => {
          stockMap[inv.product_id] = (stockMap[inv.product_id] || 0) + 1;
        });
      }

      let outOfStockCount = 0;
      if (allProducts) {
        if (mode === 'manual') {
          outOfStockCount = allProducts.filter((p: any) => p.status === 'habis').length;
        } else {
          outOfStockCount = allProducts.filter((p: any) => (stockMap[p.id] || 0) === 0).length;
        }
        
        // Inject stock data into products
        const productsWithStock = allProducts.map((p: any) => ({
          ...p,
          _stockCount: mode === 'gateway' ? (stockMap[p.id] || 0) : null
        }));
        setProducts(productsWithStock);
      }

      setStatsData({
        products: totalProducts || 0,
        drafts: drafts || 0,
        flashSales: flashSales || 0,
        categories: totalCategories || 0,
        outOfStock: outOfStockCount
      });
      
      if (allCategories) setCategories(allCategories);
      setIsLoading(false);
    };
    
    fetchData();
  }, []);

  // Build a category name map
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const stats = [
    { label: "Total Produk", value: statsData.products, icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Produk Habis", value: statsData.outOfStock, icon: Package, color: "text-red-500", bg: "bg-red-50" },
    { label: "Flash Sale Aktif", value: statsData.flashSales, icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Total Kategori", value: statsData.categories, icon: Tags, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  // Use real data from database columns
  const productAnalytics = useMemo(() => {
    return products.map((p) => {
      const views = p.views || 0;
      const clicks = p.clicks || 0;
      const conversion = views > 0 ? ((clicks / views) * 100) : 0;
      const categoryName = categoryMap[p.category_id] || "Umum";

      return {
        ...p,
        views,
        clicks,
        conversion,
        categoryName,
        isBestSeller: !!p.is_best_seller,
        stockDisplay: paymentMode === 'manual' 
          ? (p.status === 'habis' ? 'Habis' : 'Ready') 
          : `${p._stockCount || 0} Item`,
      };
    });
  }, [products, categoryMap]);

  // Sort
  const sortedProducts = useMemo(() => {
    const sorted = [...productAnalytics];
    sorted.sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortField === "views") { aVal = a.views; bVal = b.views; }
      else if (sortField === "clicks") { aVal = a.clicks; bVal = b.clicks; }
      else { aVal = a.conversion; bVal = b.conversion; }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [productAnalytics, sortField, sortDir]);

  // Filter
  const filteredProducts = sortedProducts.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleToggleBestSeller = async (productId: number, currentValue: boolean) => {
    const newValue = !currentValue;
    
    // Optimistic update
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, is_best_seller: newValue } : p
    ));

    const { error } = await supabase
      .from('products')
      .update({ is_best_seller: newValue })
      .eq('id', productId);

    if (error) {
      // Revert on failure
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_best_seller: currentValue } : p
      ));
      toast.error("Gagal mengubah status terlaris: " + error.message);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" 
      ? <ChevronDown size={13} className="inline ml-0.5" />
      : <ChevronUp size={13} className="inline ml-0.5" />;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 pb-10">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Dashboard Overview </h1>
          <p className="text-zinc-500 text-sm mt-1">Memuat data...</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white animate-pulse rounded-3xl h-28" />
          ))}
        </div>
        <div className="bg-white animate-pulse rounded-3xl h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Dashboard Overview </h1>
        <p className="text-zinc-500 text-sm mt-1">Pantau performa produk dan metrik toko Anda hari ini.</p>
        <div className="mt-3">
          <span className={`inline-flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-full border ${
            paymentMode === 'gateway'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${paymentMode === 'gateway' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            Status Sistem: {paymentMode === 'gateway' ? 'Payment Gateway' : 'Manual'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-zinc-50 p-5 rounded-3xl border border-zinc-200 shadow-none"
          >
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-full flex items-center justify-center mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-extrabold text-zinc-950">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Analytics Table Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-zinc-50 rounded-3xl border border-zinc-200 shadow-none overflow-hidden"
      >
        <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-zinc-950">Performa Produk </h2>
          
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-full text-sm focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all text-zinc-950"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Produk</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kategori</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Sisa Stok</th>
                <th 
                  className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-950 transition-colors select-none"
                  onClick={() => handleSort("views")}
                >
                  Total Views <SortIcon field="views" />
                </th>
                <th 
                  className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-950 transition-colors select-none"
                  onClick={() => handleSort("clicks")}
                >
                  Total Order Klik <SortIcon field="clicks" />
                </th>
                <th 
                  className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:text-zinc-950 transition-colors select-none"
                  onClick={() => handleSort("conversion")}
                >
                  Konversi* <SortIcon field="conversion" />
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Set Terlaris</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className={`hover:bg-white/30 transition-colors ${p.status === 'habis' ? 'opacity-50 bg-white' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <div className="w-10 h-10 rounded-xl shrink-0 shadow-none overflow-hidden relative bg-white border border-zinc-200">
                          <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="40px" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl shrink-0 shadow-none flex items-center justify-center bg-white border border-zinc-200 text-zinc-500">
                          <ImageIcon size={16} />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-950 truncate">{p.name}</span>
                          {p.isBestSeller && (
                            <span className="bg-amber-100 text-amber-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <Sparkles size={10} />
                              TERLARIS
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 truncate">/{p.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-zinc-500 bg-white px-2 py-0.5 rounded-full">{p.categoryName}</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-right">
                    <span className={
                      p.stockDisplay === 'Habis' || p.stockDisplay === '0 Item' 
                        ? 'text-red-500 font-bold' 
                        : 'text-zinc-950'
                    }>
                      {paymentMode === 'manual' ? `Manual (${p.stockDisplay})` : p.stockDisplay}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-zinc-950 text-right">{p.views.toLocaleString()}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-zinc-950 text-right">{p.clicks.toLocaleString()}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-sm font-bold text-zinc-950">{p.conversion.toFixed(1)}%</span>
                      {p.conversion >= 20 ? (
                        <ArrowUpRight size={14} className="text-green-500" />
                      ) : (
                        <ArrowDownRight size={14} className="text-red-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={p.isBestSeller}
                        onChange={() => handleToggleBestSeller(p.id, p.isBestSeller)}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white"></div>
                    </label>
                  </td>
                </tr>
              ))}
              
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      emoji=""
                      title="Tidak ada produk ditemukan."
                      description="Coba sesuaikan kata kunci pencarian Anda."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-5 py-4 border-t border-gray-50 bg-gray-50/20">
          <p className="text-[10px] text-zinc-500 italic">
            *Konversi = (Total Order Klik / Total Views) × 100%
          </p>
        </div>
      </motion.div>
    </div>
  );
}
