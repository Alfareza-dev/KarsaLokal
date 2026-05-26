import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="px-4 mb-6">
      <div className="relative flex items-center w-full h-14 bg-white rounded-2xl border border-zinc-200 focus-within:border-zinc-300 transition-all duration-200 hover:border-zinc-300 shadow-none">
        <Search className="absolute left-4 text-zinc-500" size={20} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cari produk lokal, camilan, atau kerajinan tangan..."
          className="w-full h-full bg-transparent border-none focus:ring-0 text-zinc-950 placeholder:text-zinc-500 pl-12 pr-4 rounded-2xl outline-none"
        />
      </div>
    </div>
  );
}
