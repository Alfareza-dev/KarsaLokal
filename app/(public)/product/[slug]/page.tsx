// Server Component — exports generateMetadata for SEO, renders the client page
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { ProductDetailClient } from "./ProductDetailClient";
import { getStoreConfig } from "@/lib/store";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("name, description, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  const config = await getStoreConfig();

  if (!product) {
    return {
      title: "Halaman Tidak Ditemukan",
      description: config.meta_description,
    };
  }

  const pageTitle = product.name;
  const ogTitle = `${product.name} | ${config.name}`;
  const description =
    product.description
      ? product.description.slice(0, 160)
      : `Beli ${product.name} di ${config.name} — ${config.tagline || 'katalog produk digital terpercaya'}.`;

  return {
    title: pageTitle,
    description,
    openGraph: {
      title: ogTitle,
      description,
      images: product.image_url
        ? [{ url: product.image_url, width: 1200, height: 630 }]
        : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

export default function ProductDetailPage({ params }: PageProps) {
  return <ProductDetailClient params={params} />;
}
