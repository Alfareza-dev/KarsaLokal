export function Footer({ storeConfig }: { storeConfig: any }) {
  const waNumber = storeConfig?.contact_whatsapp || "";
  const telegram = storeConfig?.contact_telegram || "";
  const instagram = storeConfig?.contact_instagram || "";

  return (
    <footer className="bg-white border-t border-zinc-200 mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Copyright */}
        <p className="text-sm text-zinc-400">
          &copy; {new Date().getFullYear()} {storeConfig?.name || "KarsaLokal"}. Pemberdayaan UMKM Lokal.
        </p>

        {/* Right: Social links */}
        <div className="flex items-center gap-5">
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-zinc-950 transition-colors"
            >
              WhatsApp
            </a>
          )}
          {telegram && (
            <a
              href={`https://t.me/${telegram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-zinc-950 transition-colors"
            >
              Telegram
            </a>
          )}
          {instagram && (
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-zinc-950 transition-colors"
            >
              Instagram
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
