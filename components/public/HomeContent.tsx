"use client";

import { useState, useMemo } from "react";
import { CategoryTabs } from "./CategoryTabs";
import { ProductGrid } from "./ProductGrid";
import { SearchBar } from "./SearchBar";
import { SearchX } from "lucide-react";

interface HomeContentProps {
  categories: any[];
  products: any[];
}

export function HomeContent({ categories, products }: HomeContentProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = activeCategory === "all" || p.category_id === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <>
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      
      {searchQuery && (
        <div className="px-4 mb-2 text-sm text-zinc-500">
          Hasil pencarian untuk: <span className="font-bold">&quot;{searchQuery}&quot;</span>
        </div>
      )}
      
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <SearchX size={48} className="text-zinc-300 mb-4" />
          <p className="text-zinc-500 text-sm max-w-sm">
            Produk UMKM belum ditemukan. Mari dukung karya pengrajin lokal lainnya!
          </p>
        </div>
      ) : (
        <ProductGrid products={filteredProducts} />
      )}
    </>
  );
}
