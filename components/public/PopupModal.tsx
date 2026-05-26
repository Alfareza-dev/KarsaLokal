"use client";
import { useState, useEffect } from "react";
import { X, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const SESSION_KEY = "hasSeenStoreWelcomePopup";

interface PopupProps {
  title: string;
  message: string;
  storeHours: string;
  extraInfo?: string;
  imageUrl?: string;
}

export function PopupModal({ title, message, storeHours, extraInfo, imageUrl }: PopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // SSR guard — sessionStorage is only available in the browser
    if (typeof window === "undefined") return;

    // If the user has already seen the popup this session, skip it
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Mark as seen immediately so navigating back to this page doesn't re-trigger
    sessionStorage.setItem(SESSION_KEY, "1");

    // Show after a short delay for a polished entry feel
    const timer = setTimeout(() => setIsOpen(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => setIsOpen(false);

  // Close on Esc key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-zinc-200 z-10"
          >
            <button
              onClick={handleClose}
              aria-label="Tutup popup"
              className="absolute top-4 right-4 p-2 bg-zinc-100 text-zinc-950 rounded-full hover:bg-zinc-200 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Hero Image or Icon */}
            {imageUrl ? (
              <div className="relative w-full h-40 -mt-6 -mx-6 mb-5 rounded-t-3xl overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  priority
                  loading="eager"
                  sizes="(max-width: 768px) 90vw, 500px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-white text-zinc-950 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                <Sparkles size={28} />
              </div>
            )}

            {/* Title & Message */}
            <h3 className="text-lg sm:text-xl font-bold text-zinc-950 text-center mb-1 leading-tight break-words line-clamp-2">{title}</h3>
            <p className="text-zinc-500 text-center mb-5">{message}</p>

            {/* Store Hours */}
            <div className="bg-zinc-50 rounded-2xl px-4 py-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-zinc-950" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Jam Operasional
                  </span>
                  <span className="text-sm font-bold text-zinc-950">{storeHours}</span>
                </div>
              </div>
            </div>

            {/* Extra info */}
            {extraInfo && (
              <p className="text-xs text-zinc-500 text-center mb-4">{extraInfo}</p>
            )}

            {/* CTA */}
            <button
              onClick={handleClose}
              className="w-full py-3 bg-zinc-950 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all"
            >
              Oke, Lihat Produk! 
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
