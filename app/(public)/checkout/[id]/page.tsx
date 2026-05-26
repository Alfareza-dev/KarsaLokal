import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStoreConfig } from "@/lib/store";
import type { Metadata } from "next";
import { CheckoutClient } from "./CheckoutClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const config = await getStoreConfig();
  return {
    title: `Checkout | ${config.name}`,
    description: `Halaman pembayaran - ${config.name}`,
  };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  // Fetch order
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", parseInt(id, 10))
    .single();

  if (error || !order) {
    redirect("/dashboard");
  }

  // Ownership check
  if (order.user_id !== user.id) {
    redirect("/dashboard");
  }

  // Fetch product info for context
  let product = null;
  if (order.product_id) {
    const { data } = await supabase
      .from("products")
      .select("name, slug, emoji, image_url, gradient_from, gradient_to")
      .eq("id", order.product_id)
      .single();
    product = data;
  }

  // For settled orders: fetch inventory content
  let inventoryContent: string | null = null;
  if (order.status === "settled") {
    const { data: inv } = await supabase
      .from("inventory")
      .select("content_data")
      .eq("order_id", order.id);
      
    if (inv && inv.length > 0) {
      if (inv.length === 1) {
        inventoryContent = inv[0].content_data;
      } else {
        inventoryContent = inv.map((item, idx) => `--- Lisensi ${idx + 1} ---\n${item.content_data}`).join("\n\n");
      }
    }
  }

  return (
    <CheckoutClient
      order={order}
      product={product}
      inventoryContent={inventoryContent}
    />
  );
}
