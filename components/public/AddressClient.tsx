/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, User, Search, Save, Check } from "lucide-react";
import { saveAddressAction } from "@/app/(public)/dashboard/address/actions";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

export function AddressClient({ userId, initialAddress }: { userId?: string; initialAddress: Record<string, any> }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _userId = userId;
  const router = useRouter();
  const [name, setName] = useState(initialAddress?.recipient_name || "");
  const [phone, setPhone] = useState(initialAddress?.phone_number || "");
  const [address, setAddress] = useState(initialAddress?.full_address || "");
  const [villageCode, setVillageCode] = useState(initialAddress?.village_code || "");
  const [villageNameText, setVillageNameText] = useState(initialAddress?.village_name || "");
  const [villageSearch, setVillageSearch] = useState("");
  
  const [searchResults, setSearchResults] = useState<Record<string, any>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const debouncedSearch = useDebounce(villageSearch, 500);

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults([]);
      return;
    }

    const fetchVillages = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/shipping/villages?name=${encodeURIComponent(debouncedSearch)}`);
        const data = await res.json();
        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
          setSearchResults(data.data);
          setShowDropdown(true);
        } else {
          setSearchResults([]);
          setShowDropdown(false);
        }
      } catch (err) {
        console.error(err);
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    };

    fetchVillages();
  }, [debouncedSearch]);

  const handleSelectVillage = (village: Record<string, any>) => {
    const fullName = `${village.name}, ${village.district || ""}, ${village.regency || ""}, ${village.province || ""}`;
    setVillageCode(village.code);
    setVillageNameText(fullName);
    setVillageSearch(fullName);
    setShowDropdown(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address || !villageCode) {
      toast.error("Mohon lengkapi semua data");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: initialAddress?.id,
        recipient_name: name,
        phone_number: phone,
        full_address: address,
        village_code: villageCode,
        village_name: villageNameText,
      };

      const result = await saveAddressAction(payload);
      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Alamat berhasil disimpan");
      router.refresh();
      setTimeout(() => router.back(), 1500);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan alamat");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-950 transition-colors"
      >
        <ArrowLeft size={16} /> Kembali
      </button>

      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 sm:p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-zinc-950 mb-2">Alamat Pengiriman</h1>
        <p className="text-sm text-zinc-500 mb-8">Pastikan alamat dan kecamatan terisi dengan benar untuk pengiriman fisik produk UMKM.</p>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-zinc-950 mb-2">Nama Penerima</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap"
                className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 transition-all text-zinc-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-950 mb-2">Nomor Telepon</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 transition-all text-zinc-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-950 mb-2">Alamat Lengkap</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3 text-zinc-400" size={18} />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nama Jalan, Gedung, No. Rumah, RT/RW, Patokan"
                rows={3}
                className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 transition-all text-zinc-950 resize-none"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-zinc-950 mb-2">Kecamatan / Desa</label>
            
            {villageCode ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-green-100 p-1 rounded-full shrink-0">
                    <Check className="text-green-600" size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-950">{villageNameText}</p>
                    <p className="text-xs text-zinc-500 mt-1">Kode area: {villageCode}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVillageCode("");
                    setVillageNameText("");
                    setVillageSearch("");
                  }}
                  className="shrink-0 text-sm font-bold bg-white border border-zinc-200 text-zinc-950 px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  Ubah
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  value={villageSearch}
                  onChange={(e) => {
                    setVillageSearch(e.target.value);
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Cari kecamatan atau desa..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 transition-all text-zinc-950"
                />
              </div>
            )}
            
            {/* Dropdown Results */}
            {!villageCode && showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((village: Record<string, any>) => (
                  <button
                    key={village.code}
                    type="button"
                    onClick={() => handleSelectVillage(village)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">{village.name}</p>
                      <p className="text-xs text-zinc-500">
                        {village.district || ""}, {village.regency || ""}, {village.province || ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Empty State */}
            {!villageCode && debouncedSearch.length >= 3 && !isSearching && searchResults.length === 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg p-4 text-center">
                <p className="text-sm font-semibold text-zinc-950">Alamat tidak ditemukan</p>
                <p className="text-xs text-zinc-500 mt-1">Coba cari dengan nama kecamatan atau kabupaten yang lebih spesifik.</p>
              </div>
            )}

            {!villageCode && isSearching && (
              <p className="text-xs text-zinc-500 mt-2">Mencari area...</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving || !villageCode}
            className="mt-4 w-full bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed font-bold py-3.5 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isSaving ? "Menyimpan..." : (
              <>
                <Save size={18} /> Simpan Alamat
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
