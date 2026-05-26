"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveAddressAction(payload: {
  id?: string;
  recipient_name: string;
  phone_number: string;
  full_address: string;
  village_code: string;
  village_name?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient(); // Uses service role, bypasses RLS

  const dbPayload = {
    user_id: user.id,
    recipient_name: payload.recipient_name,
    phone_number: payload.phone_number,
    full_address: payload.full_address,
    village_code: payload.village_code,
    village_name: payload.village_name || null,
  };

  try {
    if (payload.id) {
      const { error } = await supabase
        .from("user_addresses")
        .update(dbPayload)
        .eq("id", payload.id)
        .eq("user_id", user.id); // Ensure they own it
      if (error) throw error;
    } else {
      const { error } = await supabase.from("user_addresses").insert(dbPayload);
      if (error) throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error("saveAddressAction error:", error);
    return { success: false, error: error.message || "Failed to save address" };
  }
}
