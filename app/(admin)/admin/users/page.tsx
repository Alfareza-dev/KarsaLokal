"use client";

import { useState, useEffect } from "react";
import { Users, Shield, User, Trash2, Search, AlertTriangle, X, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type UserData = {
  id: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
  role: "admin" | "user";
  full_name: string;
  whatsapp_number: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    
    // Get current user to prevent self-demotion/deletion
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        toast.error(data.error || "Gagal memuat pengguna");
      }
    } catch {
      toast.error("Koneksi error saat memuat pengguna");
    }
    setIsLoading(false);
  };

  const handleUpdateRole = async (userId: string, newRole: "admin" | "user") => {
    if (userId === currentUserId && newRole === "user") {
      toast.error("Anda tidak bisa menghapus akses admin milik Anda sendiri.");
      return;
    }

    setIsUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Gagal mengubah role pengguna");
    }
    setIsUpdating(null);
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === currentUserId) {
      toast.error("Anda tidak bisa menghapus akun Anda sendiri.");
      setConfirmDeleteId(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setUsers(users.filter(u => u.id !== userId));
        setConfirmDeleteId(null);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Gagal menghapus pengguna");
    }
    setIsDeleting(false);
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.whatsapp_number.includes(searchQuery)
  );

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-2">
            <Users size={24} className="text-zinc-950" /> Manajemen Pengguna
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Kelola akses, role, dan data akun pengguna</p>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-50 rounded-[24px] border border-zinc-200 shadow-none overflow-hidden flex flex-col">
        <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-zinc-500" /></div>
            <input type="text" placeholder="Cari nama, email, atau no. WA..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-300 focus:ring-2 focus:ring-primary/20 transition-all text-zinc-950" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto text-sm text-zinc-500 font-medium">
            <span>Total:</span><span className="bg-white text-zinc-950-hover px-2 py-0.5 rounded-lg">{filteredUsers.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-zinc-200">
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pengguna</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kontak</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Role Akses</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Bergabung</th>
                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-16 text-center text-zinc-500"><Loader2 size={32} className="animate-spin mx-auto mb-3 text-zinc-950" /><p>Memuat data pengguna...</p></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-16 text-center"><Users size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-zinc-500 font-medium">Tidak ada pengguna ditemukan</p></td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${u.role === 'admin' ? 'bg-white/10 border-zinc-200 text-zinc-950' : 'bg-white border-zinc-200 text-zinc-500'}`}>
                          {u.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-zinc-950 truncate leading-tight mb-1">{u.full_name || "Tanpa Nama"}</span>
                          {u.id === currentUserId && (<span className="text-[10px] bg-zinc-950 text-white px-1.5 py-0.5 rounded uppercase font-bold w-max">Anda</span>)}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500"><Mail size={12} className="text-zinc-500" /><span className="truncate">{u.email}</span></div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500"><Phone size={12} className="text-zinc-500" /><span>{u.whatsapp_number || "-"}</span></div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="relative inline-flex items-center justify-center">
                        {isUpdating === u.id && (<div className="absolute -left-6"><Loader2 size={14} className="animate-spin text-zinc-950" /></div>)}
                        <select value={u.role} onChange={(e) => handleUpdateRole(u.id, e.target.value as "admin" | "user")} disabled={isUpdating === u.id || u.id === currentUserId}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full outline-none transition-colors appearance-none pr-6 cursor-pointer border ${u.role === 'admin' ? 'bg-white/10 text-zinc-950 border-zinc-200 hover:bg-white/20 focus:ring-2 focus:ring-primary/30' : 'bg-white text-zinc-500 border-zinc-200 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: "right 0.25rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.25em 1.25em" }}>
                          <option value="admin">Admin </option>
                          <option value="user">User </option>
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-zinc-500 font-medium">{new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-4 text-right">
                      {u.id !== currentUserId && (
                        <AnimatePresence mode="wait">
                          {confirmDeleteId === u.id ? (
                            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center justify-end gap-1">
                              <button onClick={() => handleDelete(u.id, u.full_name)} disabled={isDeleting} className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />} Hapus
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)} disabled={isDeleting} className="p-1 text-zinc-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X size={14} /></button>
                            </motion.div>
                          ) : (
                            <motion.button key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDeleteId(u.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors inline-flex" title="Hapus Pengguna">
                              <Trash2 size={16} />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
