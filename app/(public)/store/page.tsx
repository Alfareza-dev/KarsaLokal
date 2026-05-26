import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getStoreConfig } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/public/Header";
import { BannerCarousel } from "@/components/public/BannerCarousel";
import { HomeContent } from "@/components/public/HomeContent";
import { FlashSaleBanner } from "@/components/public/FlashSaleBanner";
import { Footer } from "@/components/public/Footer";
import {
  HeaderSkeleton,
  BannerSkeleton,
  FlashSaleSkeleton,
  CategorySkeleton,
  ProductGridSkeleton,
} from "@/components/ui/Skeleton";

// ─────────────────────────────────────────────────────────────
// Async sub-components for streaming — each fetches its own data
// ─────────────────────────────────────────────────────────────

async function AsyncHeader() {
  const [config, user] = await Promise.all([getStoreConfig(), getCurrentUser()]);
  return (
    <Header
      storeName={config.name}
      userName={user?.full_name}
      isLoggedIn={!!user}
    />
  );
}


async function AsyncBanner() {
  const supabase = await createClient();
  const config = await getStoreConfig();
  const { data: banners } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  return (
    <BannerCarousel
      banners={banners || []}
      storeName={config.name}
      brandEmoji={config.brand_emoji}
    />
  );
}

async function AsyncFlashSale() {
  const supabase = await createClient();
  const { data: flashSales } = await supabase
    .from("flash_sales")
    .select("*, product:products(*)")
    .eq("is_active", true);

  if (!flashSales || flashSales.length === 0) return null;

  // Filter only genuinely active flash sales
  const now = new Date();
  const activeSales = flashSales.filter(
    (fs) => new Date(fs.end_at) > now && new Date(fs.start_at) <= now
  );
  if (activeSales.length === 0) return null;

  return <FlashSaleBanner flashSales={activeSales} />;
}

async function AsyncCatalog() {
  const supabase = await createClient();
  const [config, { data: categories }, { data: products }, { data: flashSales }, { data: stockData }] =
    await Promise.all([
      getStoreConfig(),
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true }),
      supabase
        .from("products")
        .select("*, category:categories(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("flash_sales")
        .select("*, product:products(*)")
        .eq("is_active", true),
      supabase
        .from("inventory_stock")
        .select("product_id, available_stock"),
    ]);

  // Build stock count map
  const stockMap: Record<number, number> = {};
  for (const row of stockData || []) {
    stockMap[row.product_id] = row.available_stock;
  }

  const now = new Date();
  const publicProducts = (products || [])
    .filter((p: any) => p.status !== "draft")
    .map((p: any) => {
      const activeFlashSale = flashSales?.find(
        (fs: any) =>
          fs.product_id === p.id &&
          new Date(fs.end_at) > now &&
          new Date(fs.start_at) <= now
      );

      // Auto-status based on payment mode
      let autoStatus = p.status;
      const availableStock = stockMap[p.id] ?? 0;
      
      if (config.payment_mode === 'gateway') {
        autoStatus = availableStock === 0 ? "habis" : "ready";
      }

      const result = { ...p, status: autoStatus, _stock: availableStock };
      return activeFlashSale ? { ...result, active_flash_sale: activeFlashSale } : result;
    });

  return (
    <HomeContent categories={categories || []} products={publicProducts} />
  );
}

async function AsyncFooter() {
  const config = await getStoreConfig();
  return <Footer storeConfig={config} />;
}

// ─────────────────────────────────────────────────────────────
// Page — all sections wrapped in Suspense for streaming
// ─────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div id="home" className="w-full max-w-[480px] md:max-w-[1200px] mx-auto min-h-screen flex flex-col relative bg-white">

      {/* Header streams in with skeleton */}
      <Suspense fallback={<HeaderSkeleton />}>
        <AsyncHeader />
      </Suspense>

      <main className="flex flex-col overflow-x-hidden">
        {/* Banner streams in with skeleton */}
        <Suspense fallback={<BannerSkeleton />}>
          <AsyncBanner />
        </Suspense>

        {/* Flash sale: skeleton shown during load, disappears if none active */}
        <Suspense fallback={<FlashSaleSkeleton />}>
          <AsyncFlashSale />
        </Suspense>

        {/* Catalog (categories + product grid) with staggered skeleton */}
        <Suspense
          fallback={
            <>
              <CategorySkeleton />
              <ProductGridSkeleton count={6} />
            </>
          }
        >
          <AsyncCatalog />
        </Suspense>

        <Suspense fallback={null}>
          <AsyncFooter />
        </Suspense>
      </main>
    </div>
  );
}
