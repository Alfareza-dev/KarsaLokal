"use client";

import { ProductCard } from "./ProductCard";
import { EmptyState } from "@/components/admin/EmptyState";

interface ProductGridProps {
  products: any[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div id="produk" className="px-4 mb-12 animate-fade-in">
      <h3 className="text-xl font-bold text-zinc-950 mb-4">Produk Pilihan</h3>
      {products.length === 0 ? (
        <EmptyState
          emoji="️"
          title="Wah, belum ada produk nih..."
          description="Produk sedang disiapkan, nantikan ya Kak! "
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((product, i) => (
            <div
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
