import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// ─── Cookie Key ───────────────────────────────────────────────────────────────
export const BRANDING_COOKIE_KEY = "sb_branding";

// ─── Types ────────────────────────────────────────────────────────────────────
export type BrandingCookie = {
  name: string;
};

// ─── Cookie Helpers ───────────────────────────────────────────────────────────
export function parseBrandingCookie(raw: string | undefined): BrandingCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.name) {
      return parsed as BrandingCookie;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Main Config Fetcher ──────────────────────────────────────────────────────
export const getStoreConfig = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("store_configs")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("[getStoreConfig] Database Error:", error);
      throw error;
    }

    if (!data) {
      console.warn("[getStoreConfig] No config found for ID 1");
      throw new Error("No config data");
    }

    return {
      ...data,
      name: data.name || "Katalog Digital",
      tagline: data.tagline || "Temukan produk digital terbaik",
      meta_description: data.tagline || "Temukan produk digital terbaik",
    };
  } catch (err) {
    console.error("[getStoreConfig] Critical Failure, attempting cookie fallback:", err);

    // ── Cookie Fallback ──────────────────────────────────────────────────────
    try {
      const cookieStore = await cookies();
      const raw = cookieStore.get(BRANDING_COOKIE_KEY)?.value;
      const branding = parseBrandingCookie(raw);

      if (branding) {
        console.info("[getStoreConfig] Using branding cookie as fallback");
        return {
          name: branding.name,
          tagline: "Temukan produk digital terbaik",
          meta_description: "Katalog produk digital dengan berbagai pilihan menarik.",
        };
      }
    } catch {
      // cookie reading failed — fall through to static fallback
    }

    // ── Static Fallback ──────────────────────────────────────────────────────
    return {
      name: "Katalog Digital",
      tagline: "Temukan produk digital terbaik",
      meta_description: "Katalog produk digital dengan berbagai pilihan menarik.",
    };
  }
});
