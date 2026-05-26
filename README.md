# 🌟 KarsaLokal

> **Koleksi Terkurasi, Kualitas Premium dari Karsa Lokal.**

KarsaLokal is a premium e-commerce platform dedicated to empowering local SMEs (UMKM) by providing a high-end, minimalist digital storefront. It bridges the gap between curated local products and buyers who appreciate quality, transparency, and a premium shopping experience.

## ✨ Features

- **Premium Minimalist Design**: A clean, modern aesthetic utilizing a light theme (zinc/white) to highlight product photography and create a high-end feel.
- **Smart Logistics Engine**: Automated, weight-based village-level shipping cost calculation across Indonesia, ensuring transparent and accurate delivery fees.
- **Flexible Fulfillment**: Support for automated courier delivery as well as Self-Pickup options.
- **Integrated Payment Flow**: Seamless checkout process with automatic stock reduction and transaction tracking.
- **Full-featured Admin Dashboard**:
  - **Product & Category Management**: Easy drag-and-drop ordering and visibility toggles.
  - **Order Processing**: Real-time transaction statuses (Pending, Processed, Shipped) with email notifications.
  - **User Management**: Role-based access control and user lifecycle management.
- **Dynamic Content**: Highly optimized landing pages with curated categories, flash sales, and premium copywriting.

## 🚀 Tech Stack

- **Framework**: [Next.js 16+](https://nextjs.org/) (App Router, Turbopack)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/) for fluid animations
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Row Level Security)
- **Deployment**: Vercel-ready architecture

## 📁 Project Structure

- `/app/(public)`: Public storefront (Homepage, Product Catalog, Checkout, User Dashboard)
- `/app/(admin)`: Secure Admin control panel
- `/app/api`: Serverless API routes handling payments, shipping, and webhooks
- `/components`: Modular React components grouped by context (Admin, Public, Shared)
- `/lib`: Core utilities (Supabase clients, JWT, session handling, mailer)

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, pnpm, or bun
- A Supabase Project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Alfareza-dev/KarsaLokal.git
   cd "web app"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔒 Security & Admin Access

The admin dashboard is protected via robust session management and JWT verification. Access it via `/admin/login` using an account granted the `admin` role. All `/admin/*` and `/api/admin/*` routes are protected by Next.js middleware and API route guards.

## 🎨 Design Philosophy

KarsaLokal utilizes a strictly clean Premium Light Theme:
- **Backgrounds**: Pure white (`bg-white`) and subtle off-whites (`bg-zinc-50`).
- **Typography**: Inter / Modern Sans-serif with deep zinc contrasts (`text-zinc-950`, `text-zinc-500`).
- **Borders**: Delicate dividers (`border-zinc-200`).
- No generic bright primary colors—relying instead on layout spacing, typography, and high-quality imagery to deliver a premium feel.
