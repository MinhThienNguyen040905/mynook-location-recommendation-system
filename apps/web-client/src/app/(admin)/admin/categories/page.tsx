'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Loader2, Tag, Check } from 'lucide-react';
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  type AdminCategoryUpsert,
} from '@/lib/api/admin';
import type { VenueCategory } from '@/types/venue';

interface FormState {
  key: string;
  display_name: string;
  description: string;
  synonymsRaw: string; // comma-separated
  display_order: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  key: '',
  display_name: '',
  description: '',
  synonymsRaw: '',
  display_order: '0',
  is_active: true,
};

function fromCategory(c: VenueCategory): FormState {
  return {
    key: c.key,
    display_name: c.display_name,
    description: c.description ?? '',
    synonymsRaw: (c.synonyms ?? []).join(', '),
    display_order: String(c.display_order ?? 0),
    is_active: c.is_active,
  };
}

function buildPayload(s: FormState): AdminCategoryUpsert {
  return {
    display_name: s.display_name.trim(),
    description: s.description.trim() || undefined,
    synonyms: s.synonymsRaw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    display_order: Number(s.display_order) || 0,
    is_active: s.is_active,
  };
}

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminListCategories,
  });

  const [editing, setEditing] = useState<VenueCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<VenueCategory | null>(null);

  const createMut = useMutation({
    mutationFn: (body: AdminCategoryUpsert & { key: string; display_name: string }) =>
      adminCreateCategory(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      setCreating(false);
      setForm(EMPTY);
    },
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; body: AdminCategoryUpsert }) =>
      adminUpdateCategory(vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      setEditing(null);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      setConfirmDelete(null);
    },
  });

  function openCreate() {
    setForm(EMPTY);
    setCreating(true);
    setEditing(null);
  }

  function openEdit(c: VenueCategory) {
    setForm(fromCategory(c));
    setEditing(c);
    setCreating(false);
  }

  function closeDialog() {
    setCreating(false);
    setEditing(null);
  }

  function submit() {
    if (creating) {
      createMut.mutate({
        ...buildPayload(form),
        key: form.key.trim(),
        display_name: form.display_name.trim(),
      });
    } else if (editing) {
      updateMut.mutate({ id: editing.id, body: buildPayload(form) });
    }
  }

  const dialogOpen = creating || editing !== null;
  const submitDisabled =
    !form.display_name.trim() ||
    (creating && !form.key.trim()) ||
    createMut.isPending ||
    updateMut.isPending;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center gap-2">
            <Tag size={26} className="text-nook-olive" /> Quản lý loại quán
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Master list được dùng cho AI search lọc loại địa điểm. Aliases giúp Groq map từ truy vấn tự do về key chuẩn.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-nook-olive text-white text-sm font-bold rounded-xl hover:bg-nook-olive/90 transition-colors shadow-sm"
        >
          <Plus size={16} /> Tạo category
        </button>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-slate-400">
          <Loader2 size={20} className="inline animate-spin mr-2" /> Đang tải...
        </div>
      )}
      {error instanceof Error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error.message}
        </div>
      )}

      {data && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Key</th>
                <th className="text-left px-4 py-3 font-semibold">Tên hiển thị</th>
                <th className="text-left px-4 py-3 font-semibold">Synonyms</th>
                <th className="text-center px-4 py-3 font-semibold">Order</th>
                <th className="text-center px-4 py-3 font-semibold">Active</th>
                <th className="text-right px-4 py-3 font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{c.key}</code>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.display_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {(c.synonyms ?? []).slice(0, 4).join(', ')}
                    {(c.synonyms ?? []).length > 4 && ` +${c.synonyms.length - 4}`}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{c.display_order}</td>
                  <td className="px-4 py-3 text-center">
                    {c.is_active ? (
                      <Check size={16} className="inline text-emerald-500" />
                    ) : (
                      <X size={16} className="inline text-slate-300" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 text-slate-400 hover:text-nook-olive hover:bg-nook-olive/10 rounded-lg transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Chưa có category nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">
                {creating ? 'Tạo category mới' : `Sửa: ${editing?.display_name}`}
              </h2>
              <button onClick={closeDialog} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Key (snake_case, không đổi được sau khi tạo) *
                </label>
                <input
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  disabled={!creating}
                  placeholder="VD: cafe, hotpot, vegan"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tên hiển thị *
                </label>
                <input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="VD: Quán cà phê"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mô tả (cho AI prompt)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="VD: Quán phục vụ cà phê, trà, không gian làm việc"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Synonyms (cách nhau bởi dấu phẩy)
                </label>
                <textarea
                  rows={2}
                  value={form.synonymsRaw}
                  onChange={(e) => setForm({ ...form, synonymsRaw: e.target.value })}
                  placeholder="coffee, caphe, quán nước, coffeeshop"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none font-mono"
                />
                <p className="text-xs text-slate-400">
                  Các từ đồng nghĩa được Groq dùng để map query tự do về category này.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Display order
                  </label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <label className="flex items-center gap-2 px-3 py-2 mt-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="size-4 rounded text-nook-olive"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>

              {(createMut.error || updateMut.error) && (
                <p className="text-sm text-red-500">
                  {(createMut.error as Error)?.message ?? (updateMut.error as Error)?.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button
                onClick={closeDialog}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Hủy
              </button>
              <button
                onClick={submit}
                disabled={submitDisabled}
                className="px-5 py-2 text-sm font-bold text-white bg-nook-olive hover:bg-nook-olive/90 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {(createMut.isPending || updateMut.isPending) && <Loader2 size={14} className="animate-spin" />}
                {creating ? 'Tạo' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Xóa category?</h3>
            <p className="text-sm text-slate-500">
              Bạn có chắc muốn xóa <strong>{confirmDelete.display_name}</strong>? Tất cả venue đang gán category này sẽ mất link.
            </p>
            {deleteMut.error instanceof Error && (
              <p className="text-sm text-red-500">{deleteMut.error.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-500"
              >
                Hủy
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {deleteMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
