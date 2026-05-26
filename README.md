# 🎀 Myuchielle

> **Your Digital Needs, Delivered Cute 💕**

Myuchielle is a cute, pink-themed digital product price list web application. It serves as a digital catalog where users can browse product prices and be redirected to contact channels (WhatsApp, Telegram, Instagram) for ordering. 

## 🌟 Features

- **Cute & Feminine Design**: A pink-dominant, pastel aesthetic using Tailwind CSS and Framer Motion for subtle animations.
- **Digital Catalog**: Browse products with categories, search functionality, and flash sales.
- **Product Details**: Detailed product views with FAQ and "Order Now" redirection.
- **Popup Announcements**: Configurable popup for store hours, announcements, and promos.
- **Admin Dashboard**: Full CRUD management for products, categories, banners, flash sales, and store configurations.
- **Analytics Tracking**: Tracks product views and "Order Now" clicks.

## 🚀 Tech Stack

- **Framework**: Next.js 16+
- **Styling**: Tailwind CSS, Lucide React, Framer Motion
- **Database & Auth**: Supabase (PostgreSQL + Supabase Auth)
- **Deployment**: Vercel-ready

## 📁 Project Structure

- `/app/(public)`: Public-facing pages (Homepage, Product details)
- `/app/(admin)`: Admin dashboard and management pages
- `/components`: Reusable UI components (Public, Admin, UI elements)
- `/lib`: Supabase clients and helper functions
- `/hooks`: Custom React hooks (e.g., store config, flash sale)

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase Project

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd myuchielle
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔒 Admin Access

The admin dashboard is protected. Access it via `/admin/login` using your configured Supabase Auth credentials. All admin routes (`/admin/*`) are protected by a Next.js proxy middleware.

## 🎨 Design System

- **Primary Color**: Pink-400 (`#F472B6`)
- **Accent Color**: Pink-500 (`#EC4899`)
- **Background**: Pink-50 (`#FDF2F8`)
- **Typography**: Nunito (Google Fonts)
- **Styling Details**: Rounded corners (`rounded-2xl`, `rounded-3xl`), soft shadows, and subtle hover animations (`hover:scale-105`).
