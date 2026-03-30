'use client';

import { useState, useMemo } from 'react';
import { Search, Shield, ShieldOff, ChevronDown, UserX, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type Role   = 'all' | 'user' | 'owner';
type Status = 'all' | 'active' | 'banned';

interface User {
  id: number; name: string; email: string;
  role: 'user' | 'owner'; status: 'active' | 'banned';
  joined: string; avatar: string; venues?: number;
}

const MOCK_USERS: User[] = [
  { id:  1, name: 'Nguyễn Văn An',    email: 'an@gmail.com',       role: 'user',  status: 'active', joined: '01/03/2026', avatar: 'seed/u1/80/80' },
  { id:  2, name: 'Trần Thị Bảo',     email: 'bao@gmail.com',      role: 'owner', status: 'active', joined: '28/02/2026', avatar: 'seed/u2/80/80', venues: 3 },
  { id:  3, name: 'Lê Minh Cường',    email: 'cuong@gmail.com',     role: 'user',  status: 'banned', joined: '20/02/2026', avatar: 'seed/u3/80/80' },
  { id:  4, name: 'Phạm Thu Dung',    email: 'dung@gmail.com',      role: 'user',  status: 'active', joined: '15/02/2026', avatar: 'seed/u4/80/80' },
  { id:  5, name: 'Hoàng Văn Em',     email: 'em@gmail.com',        role: 'owner', status: 'active', joined: '10/02/2026', avatar: 'seed/u5/80/80', venues: 1 },
  { id:  6, name: 'Võ Thị Phương',    email: 'phuong@gmail.com',    role: 'user',  status: 'active', joined: '05/02/2026', avatar: 'seed/u6/80/80' },
  { id:  7, name: 'Đặng Quốc Gia',    email: 'gia@gmail.com',       role: 'owner', status: 'banned', joined: '01/02/2026', avatar: 'seed/u7/80/80', venues: 2 },
  { id:  8, name: 'Bùi Thị Hoa',      email: 'hoa@gmail.com',       role: 'user',  status: 'active', joined: '25/01/2026', avatar: 'seed/u8/80/80' },
  { id:  9, name: 'Ngô Minh Inh',     email: 'inh@gmail.com',       role: 'user',  status: 'active', joined: '20/01/2026', avatar: 'seed/u9/80/80' },
  { id: 10, name: 'Dương Thu Khoa',   email: 'khoa@gmail.com',      role: 'owner', status: 'active', joined: '15/01/2026', avatar: 'seed/u10/80/80', venues: 4 },
  { id: 11, name: 'Trịnh Văn Long',   email: 'long@gmail.com',      role: 'user',  status: 'banned', joined: '10/01/2026', avatar: 'seed/u11/80/80' },
  { id: 12, name: 'Phan Thị Mai',     email: 'mai@gmail.com',       role: 'user',  status: 'active', joined: '05/01/2026', avatar: 'seed/u12/80/80' },
];

export default function AdminUsersPage() {
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState<Role>('all');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [users, setUsers]             = useState<User[]>(MOCK_USERS);
  const [confirm, setConfirm]         = useState<{ user: User; action: 'ban' | 'unban' } | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole   = roleFilter   === 'all' || u.role   === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  function toggleBan(userId: number) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: u.status === 'active' ? 'banned' : 'active' } : u
      )
    );
    setConfirm(null);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-800">Người dùng</h1>
        <p className="text-slate-500 mt-1">{users.length} tài khoản trong hệ thống</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-nook-olive"
          />
        </div>

        {/* Role filter */}
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role)}
            className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-nook-olive cursor-pointer"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="user">User</option>
            <option value="owner">Owner</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status)}
            className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-nook-olive cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="banned">Bị khoá</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-3.5 font-semibold text-slate-500">Người dùng</th>
              <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden md:table-cell">Vai trò</th>
              <th className="text-left px-6 py-3.5 font-semibold text-slate-500 hidden lg:table-cell">Ngày tham gia</th>
              <th className="text-left px-6 py-3.5 font-semibold text-slate-500">Trạng thái</th>
              <th className="text-right px-6 py-3.5 font-semibold text-slate-500">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-slate-400">
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://picsum.photos/${u.avatar}`}
                      alt={u.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <span className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-full',
                    u.role === 'owner' ? 'bg-nook-olive/10 text-nook-olive' : 'bg-slate-100 text-slate-600'
                  )}>
                    {u.role === 'owner' ? `Owner · ${u.venues} venue` : 'User'}
                  </span>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell text-slate-500">{u.joined}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-full',
                    u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  )}>
                    {u.status === 'active' ? 'Hoạt động' : 'Bị khoá'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setConfirm({ user: u, action: u.status === 'active' ? 'ban' : 'unban' })}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ml-auto',
                      u.status === 'active'
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-green-600 hover:bg-green-50'
                    )}
                  >
                    {u.status === 'active'
                      ? <><UserX size={14} /> Khoá</>
                      : <><UserCheck size={14} /> Mở khoá</>
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto',
                confirm.action === 'ban' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'
              )}>
                {confirm.action === 'ban' ? <UserX size={22} /> : <UserCheck size={22} />}
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
                {confirm.action === 'ban' ? 'Khoá tài khoản?' : 'Mở khoá tài khoản?'}
              </h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                {confirm.action === 'ban'
                  ? `Người dùng "${confirm.user.name}" sẽ không thể đăng nhập sau khi bị khoá.`
                  : `Người dùng "${confirm.user.name}" sẽ có thể đăng nhập lại.`
                }
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Huỷ
                </button>
                <button
                  onClick={() => toggleBan(confirm.user.id)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors',
                    confirm.action === 'ban' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                  )}
                >
                  {confirm.action === 'ban' ? 'Khoá' : 'Mở khoá'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
