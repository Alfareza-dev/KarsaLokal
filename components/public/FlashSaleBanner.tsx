"use client";

import { useState, useEffect } from "react";
import { Timer } from "lucide-react";
import { ProductCard } from "./ProductCard";

export function FlashSaleBanner({ flashSales }: { flashSales: any[] }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  // Find the soonest ending flash sale for the countdown
  useEffect(() => {
    const activeEndTimes = flashSales
      .filter(fs => fs.is_active && new Date(fs.end_at) > new Date())
      .map(fs => new Date(fs.end_at).getTime());

    if (activeEndTimes.length === 0) {
      setIsExpired(true);
      return;
    }
    const soonestEnd = Math.min(...activeEndTimes);

    const update = () => {
      const diff = soonestEnd - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [flashSales]);

  const pad = (n: number) => String(n).padStart(2, "0");

  // Immediately unmount when expired — no grace period
  if (isExpired) return null;

  return (
    <div className="mb-8 bg-gradient-to-r from-primary-bg-soft to-white py-6 rounded-3xl mx-4">
      <div className="px-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-bold text-accent flex items-center gap-2">
            <Timer className="text-accent" /> Flash Sale 
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded">{pad(timeLeft.hours)}</span>
          <span className="text-accent font-bold">:</span>
          <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded">{pad(timeLeft.minutes)}</span>
          <span className="text-accent font-bold">:</span>
          <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded">{pad(timeLeft.seconds)}</span>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar snap-x">
        {flashSales.map((fs) => {
          // The product data is nested inside the flash sale join
          const product = fs.product;
          if (!product) return null;
          return (
            <div key={fs.id} className="snap-start shrink-0 w-[160px]">
              <ProductCard
                product={{
                  ...product,
                  // Override price with sale price
                  current_price: fs.sale_price,
                  badge: "FLASH SALE ",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
