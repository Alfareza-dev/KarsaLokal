// Base Skeleton primitive — theme-aware shimmer effect
interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-md ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// ─────────────────────────────────────────────
// Header Skeleton
// ─────────────────────────────────────────────
export function HeaderSkeleton() {
  return (
    <header className="px-4 pt-4 pb-3">
      <Skeleton className="h-8 w-40 rounded-xl" />
    </header>
  );
}

// ─────────────────────────────────────────────
// Banner Skeleton
// ─────────────────────────────────────────────
export function BannerSkeleton() {
  return (
    <div className="px-4 mb-8">
      <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-3xl overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-3xl" />
        {/* Pulsing center text placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-7 w-48 rounded-full skeleton-shimmer" />
        </div>
        {/* Dot indicators placeholder */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full bg-zinc-50 ${i === 0 ? "w-4" : "w-2"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Flash Sale Skeleton
// ─────────────────────────────────────────────
export function FlashSaleSkeleton() {
  return (
    <div className="mb-8 py-6 rounded-3xl mx-4 bg-zinc-50">
      {/* Header row */}
      <div className="px-4 flex items-center justify-between mb-4">
        <Skeleton className="h-7 w-36 rounded-xl" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-10 rounded" />
          <Skeleton className="h-7 w-10 rounded" />
          <Skeleton className="h-7 w-10 rounded" />
        </div>
      </div>
      {/* Product cards row */}
      <div className="flex gap-4 px-4 pb-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shrink-0 w-[160px]">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Category Tabs Skeleton
// ─────────────────────────────────────────────
const CATEGORY_WIDTHS = [80, 100, 70, 90, 75, 60];

export function CategorySkeleton() {
  return (
    <div className="mb-6 px-4">
      <div className="flex gap-3 overflow-x-hidden pb-2">
        {CATEGORY_WIDTHS.map((w, i) => (
          <Skeleton
            key={i}
            className="shrink-0 h-9 rounded-full"
            style={{ width: `${w}px`, animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Product Card Skeleton
// ─────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-3 border border-zinc-200 flex flex-col gap-2 h-full">
      {/* Image placeholder */}
      <Skeleton className="w-full aspect-square rounded-2xl" />
      {/* Title lines */}
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-3/4 rounded-md" />
      {/* Price */}
      <div className="mt-auto pt-2 flex flex-col gap-1">
        <Skeleton className="h-3 w-1/2 rounded-md" />
        <Skeleton className="h-6 w-3/4 rounded-md" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Product Grid Skeleton (staggered)
// ─────────────────────────────────────────────
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="px-4 mb-12">
      <Skeleton className="h-7 w-48 rounded-xl mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ animationDelay: `${i * 80}ms` } as React.CSSProperties}>
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Full Page Skeleton — composed fallback
// ─────────────────────────────────────────────
export function HomePageSkeleton() {
  return (
    <div className="w-full max-w-[480px] md:max-w-[1200px] mx-auto min-h-screen flex flex-col">
      <HeaderSkeleton />
      <main className="flex flex-col overflow-x-hidden">
        <BannerSkeleton />
        <CategorySkeleton />
        <ProductGridSkeleton count={6} />
      </main>
    </div>
  );
}
