"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

interface Banner {
  id: number;
  image_url: string;
  title?: string;
  subtitle?: string;
  is_active: boolean;
}

export function BannerCarousel({ banners, storeName, brandEmoji = "" }: { banners: Banner[], storeName?: string, brandEmoji?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    // Placeholder gradient when no banners
    return (
      <div className="px-4 mb-8 animate-fade-in">
        <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-3xl overflow-hidden shadow-none bg-gradient-to-r from-primary/60 via-primary/80 to-primary flex items-center justify-center text-center px-4">
          <span className="text-white/80 text-xl sm:text-2xl font-extrabold tracking-widest drop-shadow-md">
            {brandEmoji} {storeName || 'Katalog Digital'} {brandEmoji}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mb-8 animate-fade-in">
      <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-3xl overflow-hidden shadow-none">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Banner Image */}
            {banner.image_url ? (
              <Image
                src={banner.image_url}
                alt={banner.title || `Banner ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 480px) 100vw, 1200px"
                priority={index === 0}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-primary" />
            )}

            {/* Decorative blobs */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-zinc-50 opacity-10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/4" />
            <div className="absolute right-12 bottom-0 w-24 h-24 bg-zinc-50 opacity-20 rounded-full blur-xl transform translate-y-1/3" />

            {/* Overlay text */}
            {(banner.title || banner.subtitle) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex flex-col justify-end p-6">
                {banner.title && (
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 drop-shadow-lg">{banner.title}</h2>
                )}
                {banner.subtitle && (
                  <p className="text-sm text-white/80 drop-shadow">{banner.subtitle}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-zinc-50 w-4" : "bg-zinc-50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
