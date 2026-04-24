'use client';

import { useEffect, useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { listCategories } from '@/lib/api/categories';
import { cn } from '@/lib/utils';
import type { VenueCategory } from '@/types/venue';

interface CategoryPickerChipsProps {
  selectedIds: string[];
  primaryId: string | null;
  onChange: (ids: string[], primary: string | null) => void;
  /** Override styling via the "tone" — accents to match different modals */
  tone?: 'olive' | 'orange';
  /** Optional label above chips (default: "Chọn loại quán") */
  label?: string;
  /** Optional helper text below chips */
  helpText?: string;
}

const TONES = {
  olive: {
    active: 'bg-nook-olive text-white border-nook-olive',
    inactive: 'bg-white text-slate-600 border-slate-200 hover:border-nook-olive/40',
    primary: 'text-yellow-300 fill-yellow-300',
    primaryIdle: 'text-white/60 hover:text-yellow-300',
  },
  orange: {
    active: 'bg-[#e9590c] text-white border-[#e9590c]',
    inactive: 'bg-white text-slate-600 border-slate-200 hover:border-[#e9590c]/40',
    primary: 'text-yellow-300 fill-yellow-300',
    primaryIdle: 'text-white/60 hover:text-yellow-300',
  },
};

/**
 * Multi-select chip picker for venue categories (cafe, restaurant, ...).
 *
 * - Click chip: toggle membership. When adding the first one, it becomes primary.
 * - Click the star on a selected chip: promote it to primary.
 * - Primary category is what's shown as the venue's main type on cards.
 *
 * Controlled component — parent owns state (so form validation can see it).
 */
export function CategoryPickerChips({
  selectedIds,
  primaryId,
  onChange,
  tone = 'olive',
  label = 'Loại quán *',
  helpText = 'Chọn ít nhất 1 loại. Nhấn ngôi sao để đánh dấu loại chính.',
}: CategoryPickerChipsProps) {
  const [categories, setCategories] = useState<VenueCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = TONES[tone];

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((data) => { if (!cancelled) setCategories(data); })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError((e as Error)?.message ?? 'Không tải được danh sách loại quán');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function toggle(id: string) {
    const isSelected = selectedIds.includes(id);
    if (isSelected) {
      const newIds = selectedIds.filter((x) => x !== id);
      // If we removed the primary, demote to first remaining (or null)
      const newPrimary = primaryId === id ? (newIds[0] ?? null) : primaryId;
      onChange(newIds, newPrimary);
    } else {
      const newIds = [...selectedIds, id];
      // First selection automatically becomes primary
      const newPrimary = primaryId === null ? id : primaryId;
      onChange(newIds, newPrimary);
    }
  }

  function promote(id: string) {
    if (!selectedIds.includes(id)) return;
    onChange(selectedIds, id);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
        {label}
      </label>

      {loading && (
        <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          Đang tải loại quán...
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">
          {error}. Hãy thử tải lại trang.
        </p>
      )}

      {!loading && !error && categories.length === 0 && (
        <p className="text-sm text-slate-400 italic">
          Chưa có loại quán nào trong hệ thống. Liên hệ admin để thêm.
        </p>
      )}

      {!loading && !error && categories.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              const isPrimary = primaryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                    isSelected ? t.active : t.inactive,
                  )}
                  title={c.description ?? undefined}
                >
                  {isSelected && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        promote(c.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          promote(c.id);
                        }
                      }}
                      className="inline-flex items-center cursor-pointer"
                      aria-label={
                        isPrimary
                          ? `${c.display_name} là loại chính`
                          : `Đặt ${c.display_name} làm loại chính`
                      }
                    >
                      <Star
                        size={11}
                        className={cn(
                          'transition-colors',
                          isPrimary ? t.primary : t.primaryIdle,
                        )}
                        strokeWidth={2}
                      />
                    </span>
                  )}
                  <span>{c.display_name}</span>
                </button>
              );
            })}
          </div>
          {helpText && (
            <p className="text-[11px] text-slate-400">{helpText}</p>
          )}
        </>
      )}
    </div>
  );
}
