import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/public/DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  // Fetch orders server-side with joined inventory content in a single query (resolving N+1 query problem)
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      inventory (
        content_data
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch address
  const { data: address } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Map the joined inventory data into inventory_content for DashboardClient
  const enrichedOrders = (orders || []).map((order: any) => {
    const inventoryItem = Array.isArray(order.inventory)
      ? order.inventory[0]
      : (order.inventory as any);

    return {
      ...order,
      inventory_content: order.status === "settled" ? (inventoryItem?.content_data || null) : null,
    };
  });

  return (
    <DashboardClient
      user={{
        id: user.id,
        email: user.email,
        full_name: user.full_name || "",
        whatsapp_number: user.whatsapp_number || "",
        role: user.role || "user",
      }}
      orders={enrichedOrders}
      address={address || null}
    />
  );
}
