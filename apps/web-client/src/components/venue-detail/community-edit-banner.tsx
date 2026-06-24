'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Users, X, Check, Loader2 } from 'lucide-react';
import { updateVenue } from '@/lib/api/venues';
import { CategoryPickerChips } from '@/components/venue/category-picker-chips';
import { useAuthStore } from '@/stores/auth-store';
import type { CrowdLevel, Venue } from '@/types/venue';

interface CommunityEditBannerProps {
  venue: Venue;
}

const CROWD_OPTIONS: Array<{ value: CrowdLevel; label: string; description: string }> = [
  { value: 'empty', label: 'Vắng', description: 'Còn rất nhiều chỗ' },
  { value: 'moderate', label: 'Vừa phải', description: 'Ổn cho nhóm nhỏ' },
  { value: 'crowded', label: 'Đông', description: 'Còn ít chỗ trống' },
  { value: 'full', label: 'Đầy', description: 'Tạm thời không còn chỗ' },
];

export function CommunityEditBanner({ venue }: CommunityEditBannerProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initialCategoryIds = venue.categories?.map((category) => category.id) ?? [];
  const initialPrimaryCategoryId =
    venue.primary_category_id ??
    venue.categories?.find((category) => category.is_primary)?.id ??
    initialCategoryIds[0] ??
    null;

  const [name, setName] = useState(venue.name);
  const [description, setDescription] = useState(venue.description ?? '');
  const [addressLine, setAddressLine] = useState(venue.address_line ?? '');
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel>(venue.current_crowd_level);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string | null>(
    initialPrimaryCategoryId,
  );

  if (!venue.is_community_contributed) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateVenue(venue.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        address_line: addressLine.trim(),
        current_crowd_level: crowdLevel,
        category_ids: categoryIds,
        primary_category_id: primaryCategoryId ?? undefined,
      });
      setSuccess(true);
      setEditing(false);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Không thể cập nhật. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6">
      {/* Info banner */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <Users size={16} className="shrink-0" />
          <span>Địa điểm do cộng đồng đóng góp — ai cũng có thể cập nhật thông tin.</span>
        </div>
        {user && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-lg transition-colors shrink-0"
          >
            <Pencil size={12} /> Chỉnh sửa
          </button>
        )}
      </div>

      {success && (
        <div className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
          <Check size={16} /> Đã cập nhật thành công!
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <div className="mt-3 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Chỉnh sửa thông tin</h3>
            <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tên quán</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#e9590c]/30 focus:border-[#e9590c] outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Địa chỉ (số nhà + tên đường)</label>
            <input
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="VD: 123 Nguyễn Huệ"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#e9590c]/30 focus:border-[#e9590c] outline-none transition-all"
            />
            <p className="text-xs text-slate-400">Để đổi Quận/Thành phố, vui lòng dùng form chỉnh sửa đầy đủ.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mô tả</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#e9590c]/30 focus:border-[#e9590c] outline-none transition-all resize-none"
            />
          </div>

          <CategoryPickerChips
            selectedIds={categoryIds}
            primaryId={primaryCategoryId}
            onChange={(ids, primary) => {
              setCategoryIds(ids);
              setPrimaryCategoryId(primary);
            }}
            tone="orange"
            label="Loại venue"
            helpText="Chọn một hoặc nhiều loại. Ngôi sao là loại chính hiển thị trên card và dùng cho tìm kiếm."
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Mức đông hiện tại
            </label>
            <select
              value={crowdLevel}
              onChange={(event) => setCrowdLevel(event.target.value as CrowdLevel)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#e9590c]/30 focus:border-[#e9590c] outline-none transition-all"
            >
              {CROWD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              Trạng thái này cập nhật phần Live Crowd trên trang venue.
            </p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !addressLine.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#e9590c] hover:bg-[#c2410b] rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
