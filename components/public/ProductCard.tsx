import Link from "next/link";
import Image from "next/image";

interface ProductCardProps {
  product: {
    id: number;
    slug: string;
    name: string;
    current_price: number;
    normal_price: number;
    gradient_from?: string;
    gradient_to?: string;
    emoji?: string;
    badge?: string;
    image_url?: string;
    is_best_seller?: boolean;
    is_new?: boolean;
    status?: string;
    active_flash_sale?: any;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const isOutOfStock = product.status === "habis";
  const displayPrice = product.active_flash_sale ? product.active_flash_sale.sale_price : product.current_price;
  const comparePrice = product.active_flash_sale ? product.current_price : product.normal_price;

  return (
    <Link href={`/product/${product.slug}`} className={`block h-full group ${isOutOfStock ? 'pointer-events-none' : ''}`}>
      <div className={`bg-white rounded-xl p-3 border border-zinc-200 flex flex-col gap-2 hover:shadow-md hover:border-zinc-300 transition-all duration-200 cursor-pointer h-full ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}>
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
          {/* Gradient background as base layer */}
          <div
            className="absolute inset-0 group-hover:scale-110 transition-transform duration-500"
            style={{
              background: `linear-gradient(135deg, ${product.gradient_from || '#18181B'} 0%, ${product.gradient_to || '#FAFAFA'} 100%)`,
            }}
          />
          {/* Decorative glow */}
          <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />

          {/* Product Image (if available) or Emoji fallback */}
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover group-hover:scale-110 transition-transform duration-500 z-[1]"
              priority={true}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl drop-shadow select-none">{product.emoji || ''}</span>
            </div>
          )}

          {/* Dual Badges — stacked vertically */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {product.is_best_seller && (
              <span className="bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-none whitespace-nowrap">
                 Terlaris
              </span>
            )}
            {product.is_new && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-none whitespace-nowrap">
                 Baru
              </span>
            )}
            {/* Fallback for legacy badge field (flash sale, etc.) */}
            {!product.is_best_seller && !product.is_new && product.badge && (
              <span className="bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-none whitespace-nowrap">
                {product.badge}
              </span>
            )}
          </div>

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <span className="bg-zinc-50 text-zinc-950 text-xs font-bold px-3 py-1.5 rounded-full">Stok Habis</span>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-grow">
          <h4 className="text-sm font-bold text-zinc-900 line-clamp-2 leading-tight mb-1 group-hover:text-zinc-950 transition-colors">
            {product.name}
          </h4>
          <div className="mt-auto pt-2">
            {comparePrice > displayPrice && (
              <div className="text-xs text-zinc-500 line-through">
                Rp {comparePrice.toLocaleString("id-ID")}
              </div>
            )}
            <div className="text-lg font-semibold text-zinc-950 flex items-center gap-2">
              Rp {displayPrice.toLocaleString("id-ID")}
              {product.active_flash_sale && (
                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">
                  Sale
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
