"use client";

import { useState, useEffect } from "react";
import { Search, Check } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface VillageSelectProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

export function VillageSelect({ value, onChange, label = "Kecamatan / Desa" }: VillageSelectProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    if (!debouncedSearch) {
      setResults([]);
      return;
    }

    const fetchVillages = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/shipping/villages?name=${encodeURIComponent(debouncedSearch)}`);
        const data = await res.json();
        if (data && data.data && Array.isArray(data.data)) {
          setResults(data.data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };

    fetchVillages();
  }, [debouncedSearch]);

  const handleSelect = (village: any) => {
    onChange(village.code);
    const parts = [
      village.name,
      village.district,
      village.regency,
      village.province
    ].filter(Boolean);
    setSearch(parts.join(", "));
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-zinc-950 mb-2">{label}</label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange("");
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder="Cari kecamatan atau desa..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 transition-all text-zinc-950"
        />
      </div>
      
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map((village: any) => (
            <button
              key={village.code}
              type="button"
              onClick={() => handleSelect(village)}
              className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-950">{village.name}</p>
                <p className="text-xs text-zinc-500">
                  {village.district || ""}, {village.regency || ""}, {village.province || ""}
                </p>
              </div>
              {value === village.code && (
                <Check size={16} className="text-zinc-950" />
              )}
            </button>
          ))}
        </div>
      )}
      {isSearching && (
        <p className="text-xs text-zinc-500 mt-2">Mencari area...</p>
      )}
      {!isSearching && value && (
        <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
          <Check size={12} /> Kode area terpilih: {value}
        </p>
      )}
    </div>
  );
}
