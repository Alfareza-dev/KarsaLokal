import { useState } from "react";
import { UploadCloud, X, ImageIcon, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import imageCompression from "browser-image-compression";

// Valid storage buckets — must match buckets created in Supabase Dashboard
type StorageBucket = "images" | "product-images" | "banner-images";

interface ImageUploaderProps {
  bucket: StorageBucket;
  folder: "products" | "banners" | "config";
  currentImageUrl?: string | null;
  onUploadSuccess: (url: string) => void;
  onRemove: () => void;
  aspectRatio?: string; // e.g. "aspect-square", "aspect-video"
}

type UploadPhase = "idle" | "compressing" | "uploading" | "done";

export function ImageUploader({ 
  bucket, 
  folder, 
  currentImageUrl, 
  onUploadSuccess, 
  onRemove,
  aspectRatio = "aspect-square" 
}: ImageUploaderProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow up to 10MB before compression (will be compressed down to ≤1MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10MB");
      return;
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Format file tidak didukung. Gunakan JPG, PNG, atau WebP.");
      return;
    }

    try {
      setError(null);

      // ── Phase 1: Compress ────────────────────────────────────────────
      setPhase("compressing");
      setProgress("Mengompres gambar...");

      const compressionOptions = {
        maxSizeMB: 1,           // Target max 1MB
        maxWidthOrHeight: 1920, // Web-friendly resolution
        useWebWorker: true,
        onProgress: (p: number) => {
          setProgress(`Mengompres... ${p}%`);
        },
      };

      const compressedFile = await imageCompression(file, compressionOptions);
      const savedKB = Math.round((file.size - compressedFile.size) / 1024);

      // ── Phase 2: Upload to Supabase ──────────────────────────────────
      setPhase("uploading");
      setProgress("Mengupload...");

      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPhase("done");
      setProgress(`Dikompresi & disimpan (hemat ${savedKB}KB)`);
      onUploadSuccess(publicUrl);

      // Reset phase after a brief "done" flash
      setTimeout(() => setPhase("idle"), 2000);
    } catch (err: any) {
      console.error(`[ImageUploader] Upload error (bucket: ${bucket}, folder: ${folder}):`, err);
      setError(err.message || "Gagal mengupload gambar");
      setPhase("idle");
    }
  };

  const isProcessing = phase === "compressing" || phase === "uploading";

  return (
    <div className="flex flex-col gap-2">
      {currentImageUrl ? (
        <div className={`relative w-full ${aspectRatio} bg-white rounded-xl overflow-hidden border border-zinc-200 group`}>
          <Image 
            src={currentImageUrl} 
            alt="Preview" 
            fill 
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button 
              type="button"
              onClick={onRemove}
              className="bg-zinc-50 text-red-500 p-2 rounded-lg font-bold text-sm shadow-none hover:scale-105 transition-transform flex items-center gap-2"
            >
              <X size={16} />
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <div className={`relative w-full ${aspectRatio} bg-white/50 border-2 border-dashed border-zinc-200 hover:border-zinc-300 hover:bg-white rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors`}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          {phase === "compressing" && (
            <div className="flex flex-col items-center gap-2 text-zinc-950">
              <div className="w-8 h-8 border-4 border-zinc-200 border-t-pink-500 rounded-full animate-spin" />
              <span className="text-xs font-semibold">{progress}</span>
            </div>
          )}
          {phase === "uploading" && (
            <div className="flex flex-col items-center gap-2 text-zinc-950">
              <div className="w-8 h-8 border-4 border-zinc-200 border-t-pink-500 rounded-full animate-spin" />
              <span className="text-xs font-semibold">Mengupload...</span>
            </div>
          )}
          {phase === "done" && (
            <div className="flex flex-col items-center gap-2 text-green-500">
              <CheckCircle size={32} />
              <span className="text-xs font-semibold">{progress}</span>
            </div>
          )}
          {phase === "idle" && (
            <>
              <UploadCloud size={32} className="text-zinc-950/70" />
              <div className="text-center px-4">
                <p className="text-sm font-bold text-zinc-950">Pilih Gambar</p>
                <p className="text-xs text-zinc-500 mt-0.5">JPG, PNG (Auto-compress ke ≤1MB)</p>
              </div>
            </>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}
