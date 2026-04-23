'use client';

import { useState } from 'react';
import { Search, ChevronDown, UserX, UserCheck, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { listAccounts, setAccountStatus, type AdminAccount, type ListAccountsParams } from '@/lib/api/admin';

type TypeFilter = 'all' | 'customer' | 'owner' | 'admin';
type StatusFilter = 'all' | 'active' | 'banned';

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN');
}

function initials(name: string | null, email: string): string {
  const s = (name || email || '?').trim();
  const parts = s.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ user: AdminAccount; action: 'ban' | 'unban' } | null>(null);

  const qc = useQueryClient();

  const params: ListAccountsParams = {
    page,
    limit: PAGE_SIZE,
    ...(search.trim() ? { q: search.trim() } : {}),
    ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    ...(statusFilter !== 'all' ? { is_active: statusFilter === 'active' } : {}),
  };

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin', 'accounts', params],
    queryFn: () => listAccounts(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      setAccountStatus(id, is_active),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success(vars.is_active ? 'Đã mở khoá tài khoản' : 'Đã khoá tài khoản');
      setConfirm(null);
    },
    onError: () => {
      toast.error('Thao tác thất bại. Vui lòng thử lại.');
    },
  });

  const accounts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-800">Người dùng</h1>
        <p className="text-slate-500 mt-1">
          {isLoading ? 'Đang tải...' : `${total} tài khoản trong hệ thống`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-nook-olive"
          />
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as TypeFilter); setPage(1); }}
            className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-nook-olive cursor-pointer"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="customer">Customer</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
            className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-nook-olive cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="banned">Bị khoá</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          Không tải được danh sách tài khoản. Kiểm tra API Gateway và quyền admin.
        </div>
      )}

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
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-slate-400">
                  <Loader2 size={18} className="animate-spin inline mr-2" /> Đang tải...
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-slate-400">
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            ) : accounts.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.full_name ?? u.email}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-nook-olive/10 text-nook-olive text-xs font-bold flex items-center justify-center shrink-0">
                        {initials(u.full_name, u.email)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{u.full_name ?? '(chưa đặt tên)'}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <span className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-full capitalize',
                    u.type === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : u.type === 'owner'
                        ? 'bg-nook-olive/10 text-nook-olive'
                        : 'bg-slate-100 text-slate-600',
                  )}>
                    {u.type}
                  </span>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell text-slate-500">{formatDate(u.created_at)}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-full',
                    u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
                  )}>
                    {u.is_active ? 'Hoạt động' : 'Bị khoá'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    disabled={u.type === 'admin'}
                    onClick={() => setConfirm({ user: u, action: u.is_active ? 'ban' : 'unban' })}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ml-auto',
                      u.type === 'admin' && 'opacity-40 cursor-not-allowed',
                      u.type !== 'admin' && (u.is_active
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-green-600 hover:bg-green-50'),
                    )}
                  >
                    {u.is_active
                      ? <><UserX size={14} /> Khoá</>
                      : <><UserCheck size={14} /> Mở khoá</>
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Trang {page} / {totalPages} · {total} tài khoản
              {isFetching && <Loader2 size={12} className="inline ml-2 animate-spin" />}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !mutation.isPending && setConfirm(null)}>
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
                confirm.action === 'ban' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600',
              )}>
                {confirm.action === 'ban' ? <UserX size={22} /> : <UserCheck size={22} />}
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
                {confirm.action === 'ban' ? 'Khoá tài khoản?' : 'Mở khoá tài khoản?'}
              </h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                {confirm.action === 'ban'
                  ? `"${confirm.user.full_name ?? confirm.user.email}" sẽ không thể đăng nhập sau khi bị khoá.`
                  : `"${confirm.user.full_name ?? confirm.user.email}" sẽ có thể đăng nhập lại.`
                }
              </p>
              <div className="flex gap-3">
                <button
                  disabled={mutation.isPending}
                  onClick={() => setConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Huỷ
                </button>
                <button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: confirm.user.id, is_active: confirm.action === 'unban' })}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-1.5',
                    confirm.action === 'ban' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600',
                    mutation.isPending && 'opacity-70',
                  )}
                >
                  {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
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
