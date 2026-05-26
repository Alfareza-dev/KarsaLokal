import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "sonner";
import { getThemeConfig } from "@/lib/themes";
import { getStoreConfig } from "@/lib/store";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

// Dynamic metadata from store config
export async function generateMetadata(): Promise<Metadata> {
  const config = await getStoreConfig();
  
  const storeName = config.name;
  const description = config.meta_description;

  return {
    title: {
      template: `%s | ${storeName || 'KarsaLokal'}`,
      default: `${storeName || 'KarsaLokal'} - Produk UMKM & Mahakarya Nusantara`,
    },
    description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getStoreConfig();
  const themeConfig = getThemeConfig(config.theme_color);

  return (
    <html
      lang="id"
      className={`${nunito.variable} h-full antialiased`}
      style={{
        "--theme-primary": themeConfig.primary,
        "--theme-hover": themeConfig.hover,
        "--theme-bg-soft": themeConfig.bgSoft,
      } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              fontFamily: "var(--font-nunito)",
            },
          }}
        />
      </body>
    </html>
  );
}
