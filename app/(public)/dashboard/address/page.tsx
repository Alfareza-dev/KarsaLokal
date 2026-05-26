import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AddressClient } from "@/components/public/AddressClient";

export default async function AddressPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: address } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <AddressClient
          userId={user.id}
          initialAddress={address || null}
        />
      </div>
    </div>
  );
}
