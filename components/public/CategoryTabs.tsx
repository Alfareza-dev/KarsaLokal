"use client";

interface CategoryTabsProps {
  categories: { id: string; name: string; emoji?: string }[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
}

export function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  const allTabs = [{ id: "all", name: "Semua" }, ...categories.map(c => ({ id: c.id, name: c.name }))];

  return (
    <div className="mb-6 px-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x">
        {allTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onCategoryChange(tab.id)}
            className={`snap-start shrink-0 px-4 py-2 rounded-full text-sm transition-colors ${
              activeCategory === tab.id
                ? "bg-zinc-950 text-white font-medium border border-zinc-950"
                : "bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200 font-normal"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>
    </div>
  );
}
