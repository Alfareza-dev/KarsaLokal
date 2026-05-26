import { Suspense } from "react";
import { getStoreConfig } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { HeaderSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { ShoppingBag, ShieldCheck, Truck } from "lucide-react";

async function AsyncHeader() {
  const [config, user] = await Promise.all([getStoreConfig(), getCurrentUser()]);
  return (
    <Header
      storeName={config.name}
      userName={user?.full_name}
      isLoggedIn={!!user}
    />
  );
}

async function AsyncFooter() {
  const config = await getStoreConfig();
  return <Footer storeConfig={config} />;
}

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-stone-50 flex flex-col font-sans">
      <Suspense fallback={<HeaderSkeleton />}>
        <AsyncHeader />
      </Suspense>

      <main className="flex-1 flex flex-col items-center w-full">
        {/* Hero Section */}
        <div className="w-full bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50/30 pt-24 pb-20 px-4 flex flex-col items-center text-center">
          <span className="inline-block bg-orange-100 text-orange-800 text-xs px-3 py-1 rounded-full font-semibold border border-orange-200 tracking-wide uppercase mb-6 shadow-sm">
            Kurasi Mahakarya Nusantara
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-amber-900 tracking-tight leading-tight max-w-3xl mb-6">
            Satu Pintu untuk Mahakarya dan Produk UMKM Lokal Terbaik.
          </h1>
          <p className="text-lg md:text-xl text-stone-600 mb-10 max-w-2xl font-medium leading-relaxed">
            Menghubungkan Anda langsung dengan para perajin dan produsen lokal. Nikmati produk kuliner khas, kerajinan tangan autentik, dan komoditas pilihan berkualitas tinggi yang diproses dengan standar premium.
          </p>

          {/* Twin CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/store"
              className="w-full sm:w-auto bg-zinc-950 text-white hover:bg-zinc-800 transition-colors duration-200 px-8 py-3.5 rounded-lg font-semibold text-base"
            >
              Jelajahi Produk
            </Link>
            <Link
              href="#fitur"
              className="w-full sm:w-auto border border-amber-200 text-amber-800 bg-white hover:bg-amber-50 transition-colors duration-200 px-8 py-3.5 rounded-lg font-semibold text-base"
            >
              Pelajari Fitur
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="fitur" className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 w-full max-w-5xl mx-auto px-4 mt-20 text-left">
          {/* Feature 1 */}
          <div className="flex flex-col items-center md:items-start p-6 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 hover:shadow-md hover:shadow-amber-50 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5 text-emerald-700">
              <ShoppingBag size={24} />
            </div>
            <h3 className="text-lg font-bold text-amber-900 mb-2 text-center md:text-left">Dukung Produk Lokal</h3>
            <p className="text-sm text-stone-500 text-center md:text-left leading-relaxed">
              100% barang dikirim langsung dari produsen dan UMKM terverifikasi.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-center md:items-start p-6 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 hover:shadow-md hover:shadow-amber-50 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5 text-emerald-700">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-amber-900 mb-2 text-center md:text-left">Transaksi Aman & Mudah</h3>
            <p className="text-sm text-stone-500 text-center md:text-left leading-relaxed">
              Keamanan pembayaran terjamin dengan sistem verifikasi OTP instan.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-center md:items-start p-6 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 hover:shadow-md hover:shadow-amber-50 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5 text-emerald-700">
              <Truck size={24} />
            </div>
            <h3 className="text-lg font-bold text-amber-900 mb-2 text-center md:text-left">Pengiriman Terkurasi</h3>
            <p className="text-sm text-stone-500 text-center md:text-left leading-relaxed">
              Dikemas secara premium dan aman sampai di depan pintu rumah Anda.
            </p>
          </div>
        </div>

        {/* Tentang Kami & Misi */}
        <section className="w-full mt-32 px-4 text-left max-w-5xl mx-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-extrabold text-amber-900 mb-6">Menghidupkan Tradisi Melalui Sentuhan Modern</h2>
            <p className="text-lg text-stone-600 leading-relaxed font-medium">
              Di balik setiap produk unggulan yang kami kurasi, terdapat cerita tentang dedikasi, keringat, dan warisan budaya yang dijaga turun-temurun oleh para pelaku UMKM Indonesia. Platform ini lahir bukan sekadar sebagai tempat bertransaksi, melainkan sebuah ekosistem yang mengangkat derajat produk lokal ke panggung tertinggi. Kami percaya bahwa produk fisik hasil karya tangan lokal memiliki kualitas yang tidak kalah saing dengan brand internasional, asalkan disajikan dengan standar pelayanan dan teknologi premium.
            </p>
          </div>
        </section>

        {/* Kategori Produk Terkurasi */}
        <section className="w-full mt-32 px-4 text-left max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-amber-900 mb-4">Jelajahi Koleksi Unggulan Kami</h2>
            <p className="text-stone-500 text-lg">Setiap produk telah melewati proses seleksi ketat untuk menjamin keaslian dan mutu terbaik bagi Anda.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border rounded-2xl flex flex-col h-full bg-orange-50/80 border-orange-100">
              <h3 className="text-xl font-bold text-orange-950 mb-4">Kuliner & Camilan Nusantara</h3>
              <p className="text-orange-900/80 leading-relaxed">Eksplorasi cita rasa autentik khas daerah yang diproses secara higienis, dikemas premium, dan siap memanjakan lidah Anda.</p>
            </div>
            <div className="p-8 border rounded-2xl flex flex-col h-full bg-amber-50/80 border-amber-100">
              <h3 className="text-xl font-bold text-amber-950 mb-4">Kriya & Kerajinan Tangan</h3>
              <p className="text-amber-900/80 leading-relaxed">Mahakarya dekorasi, anyaman, dan perlengkapan rumah tangga yang dibuat manual oleh para pengrajin lokal berbakat.</p>
            </div>
            <div className="p-8 border rounded-2xl flex flex-col h-full bg-stone-100/80 border-stone-200">
              <h3 className="text-xl font-bold text-stone-950 mb-4">Wastra & Fashion Lokal</h3>
              <p className="text-stone-900/80 leading-relaxed">Sentuhan kain tradisional dan desain kontemporer yang merepresentasikan identitas modern nusantara.</p>
            </div>
          </div>
        </section>

        {/* Sistem Logistik Transparan */}
        <section className="w-full mt-32 mb-32 px-4 text-left max-w-5xl mx-auto">
          <div className="bg-amber-950 rounded-3xl p-10 md:p-16 border border-amber-900/50 shadow-xl">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-extrabold text-stone-100 mb-6">Fleksibilitas Pengiriman, Terintegrasi hingga ke Tingkat Desa</h2>
              <p className="text-lg text-amber-200/80 leading-relaxed mb-10">
                Kami memahami bahwa pengiriman produk fisik membutuhkan kepastian. Oleh karena itu, platform kami dilengkapi dengan sistem logistik cerdas yang terhubung langsung dengan jaringan ekspedisi nasional terpercaya.
              </p>
              <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="font-bold text-amber-950 text-lg">1</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-stone-100 mb-2">Kalkulasi Ongkir Akurat</h4>
                    <p className="text-amber-200/80 leading-relaxed">Sistem kami otomatis menghitung ongkos kirim secara real-time berdasarkan berat paket dan kode desa (10-digit) lokasi Anda untuk menghindari selisih harga.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="font-bold text-amber-950 text-lg">2</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-stone-100 mb-2">Opsi Ambil di Tempat (Self-Pickup)</h4>
                    <p className="text-amber-200/80 leading-relaxed">Ingin menghemat biaya? Anda dapat memilih metode pickup dan mengambil pesanan Anda langsung di lokasi gudang utama atau gerai UMKM mitra kami secara mandiri.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="font-bold text-amber-950 text-lg">3</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-stone-100 mb-2">Pelacakan Resi Instan</h4>
                    <p className="text-amber-200/80 leading-relaxed">Nomor resi pengiriman fisik akan langsung diperbarui oleh admin dan diinformasikan ke email Anda begitu paket diserahkan ke kurir ekspedisi.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Suspense fallback={null}>
        <AsyncFooter />
      </Suspense>
    </div>
  );
}
