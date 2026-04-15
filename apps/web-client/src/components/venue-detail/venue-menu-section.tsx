'use client';

import { useState, useEffect, useRef } from 'react';
import {
  UtensilsCrossed, Plus, Edit3, Trash2, FolderPlus,
  Check, X, Image as ImageIcon, Pencil, Sparkles, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  getCategories,
  createCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  analyzeMenuImage,
  bulkSaveMenu,
} from '@/lib/api/menu';
import type { AnalyzedMenuCategory } from '@/lib/api/menu';
import { getVenueById } from '@/lib/api/venues';
import { uploadMedia } from '@/lib/api/upload';
import { Skeleton } from '@/components/ui/skeleton';
import type { MenuCategory, MenuItem } from '@/types/venue';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

/* ── Add / Edit Item Modal ─────────────────────────────── */
function ItemModal({
  venueId,
  categories,
  item,
  onClose,
  onSaved,
}: {
  venueId: string;
  categories: MenuCategory[];
  item?: MenuItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item?.price?.toString() ?? '');
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.id ?? '');
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '');
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const [result] = await uploadMedia([file]);
      setImageUrl(result.url);
    } catch { /* ignore */ } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim() || !price || !categoryId) return;
    setSaving(true);
    try {
      if (item) {
        await updateMenuItem(venueId, item.id, {
          name: name.trim(),
          price: parseFloat(price),
          category_id: categoryId,
          image_url: imageUrl || undefined,
          is_available: isAvailable,
        });
      } else {
        await createMenuItem(venueId, {
          name: name.trim(),
          price: parseFloat(price),
          category_id: categoryId,
          image_url: imageUrl || undefined,
          is_available: isAvailable,
        });
      }
      onSaved();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{item ? 'Sửa món' : 'Thêm món mới'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tên món *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Cà phê sữa đá" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#e9590c]/30 focus:border-[#e9590c] transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Giá (VNĐ) *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="35000" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#e9590c]/30 focus:border-[#e9590c] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh mục *</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#e9590c]/30 focus:border-[#e9590c] transition-all">
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ảnh món</label>
            <div className="flex items-center gap-3">
              {imageUrl && (
                <div className="size-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 hover:border-[#e9590c] hover:text-[#e9590c] transition-colors disabled:opacity-50"
              >
                {uploading
                  ? <span className="size-4 border-2 border-[#e9590c]/40 border-t-[#e9590c] rounded-full animate-spin" />
                  : <ImageIcon size={16} />}
                {uploading ? 'Đang tải...' : 'Chọn ảnh'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)}
              className="size-4 rounded border-slate-300 text-[#e9590c] focus:ring-[#e9590c]" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Còn bán</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">Hủy</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !price || !categoryId}
            className="px-6 py-2.5 bg-[#e9590c] text-white font-bold rounded-xl hover:bg-[#c2410b] text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {item ? 'Lưu' : 'Thêm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Menu Image Analyzer (AI) ─────────────────────────── */
function MenuImageAnalyzer({ venueId, onSaved }: { venueId: string; onSaved: () => void }) {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<AnalyzedMenuCategory[] | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setError('');
    setResults(null);
    try {
      const [result] = await uploadMedia([file]);
      setImageUrl(result.url);
    } catch {
      setError('Tải ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze() {
    if (!imageUrl) return;
    setAnalyzing(true);
    setError('');
    try {
      const result = await analyzeMenuImage(venueId, imageUrl);
      setResults(result.categories);
    } catch {
      setError('Phân tích ảnh thất bại. Vui lòng thử với ảnh rõ hơn.');
    } finally {
      setAnalyzing(false);
    }
  }

  function updateCategoryName(catIdx: number, name: string) {
    setResults(prev => prev?.map((c, i) => i === catIdx ? { ...c, name } : c) ?? null);
  }

  function updateItemField(catIdx: number, itemIdx: number, field: 'name' | 'price', value: string) {
    setResults(prev => prev?.map((c, ci) =>
      ci === catIdx
        ? { ...c, items: c.items.map((item, ii) => ii === itemIdx ? { ...item, [field]: field === 'price' ? parseFloat(value) || 0 : value } : item) }
        : c,
    ) ?? null);
  }

  function removeItem(catIdx: number, itemIdx: number) {
    setResults(prev => prev?.map((c, ci) =>
      ci === catIdx ? { ...c, items: c.items.filter((_, ii) => ii !== itemIdx) } : c,
    ).filter(c => c.items.length > 0) ?? null);
  }

  function removeCategory(catIdx: number) {
    setResults(prev => prev?.filter((_, i) => i !== catIdx) ?? null);
  }

  async function handleConfirmSave() {
    if (!results || results.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await bulkSaveMenu(venueId, results, imageUrl);
      setResults(null);
      setImageUrl('');
      onSaved();
    } catch {
      setError('Lưu menu thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 mb-5">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-[#e9590c]" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Nhận diện menu từ ảnh (AI)</h3>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Tải ảnh menu của quán lên, AI sẽ tự động nhận diện các danh mục và món. Bạn có thể chỉnh sửa trước khi lưu.
      </p>

      {/* Upload area */}
      <div className="flex items-start gap-4">
        {imageUrl && (
          <div className="w-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0">
            <img src={imageUrl} alt="Menu" className="w-full object-contain max-h-60" />
          </div>
        )}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || analyzing}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:border-[#e9590c] hover:text-[#e9590c] transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
            {uploading ? 'Đang tải ảnh...' : imageUrl ? 'Đổi ảnh khác' : 'Chọn ảnh menu'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />

          {imageUrl && !results && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#e9590c] text-white font-bold rounded-xl text-sm hover:bg-[#c2410b] transition-colors disabled:opacity-50"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {analyzing ? 'Đang phân tích...' : 'Phân tích bằng AI'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

      {/* Editable results */}
      {results && results.length > 0 && (
        <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Kết quả nhận diện — Chỉnh sửa nếu cần
          </h4>

          {results.map((cat, catIdx) => (
            <div key={catIdx} className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/50">
                <input
                  value={cat.name}
                  onChange={e => updateCategoryName(catIdx, e.target.value)}
                  className="flex-1 bg-transparent font-bold text-slate-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#e9590c] rounded px-2 py-1"
                />
                <button onClick={() => removeCategory(catIdx)} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Xóa danh mục">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {cat.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-center gap-3 px-4 py-2.5">
                    <input
                      value={item.name}
                      onChange={e => updateItemField(catIdx, itemIdx, 'name', e.target.value)}
                      className="flex-1 text-sm text-slate-800 dark:text-slate-200 bg-transparent outline-none focus:ring-1 focus:ring-[#e9590c] rounded px-2 py-1"
                      placeholder="Tên món"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={e => updateItemField(catIdx, itemIdx, 'price', e.target.value)}
                        className="w-28 text-sm text-right text-[#e9590c] font-bold bg-transparent outline-none focus:ring-1 focus:ring-[#e9590c] rounded px-2 py-1"
                        placeholder="Giá"
                      />
                      <span className="text-xs text-slate-400">VNĐ</span>
                    </div>
                    <button onClick={() => removeItem(catIdx, itemIdx)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => { setResults(null); setImageUrl(''); }} className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              Hủy
            </button>
            <button
              onClick={handleConfirmSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#e9590c] text-white font-bold rounded-xl text-sm hover:bg-[#c2410b] transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Xác nhận & Lưu menu
            </button>
          </div>
        </div>
      )}

      {results && results.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          Không tìm thấy món nào trong ảnh. Vui lòng thử với ảnh menu khác.
        </p>
      )}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */
interface VenueMenuSectionProps {
  venueId: string;
  isCommunityContributed: boolean;
  menuImageUrl?: string | null;
}

export function VenueMenuSection({ venueId, isCommunityContributed, menuImageUrl }: VenueMenuSectionProps) {
  const user = useAuthStore((s) => s.user);
  const canEdit = isCommunityContributed && !!user;

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [currentMenuImageUrl, setCurrentMenuImageUrl] = useState(menuImageUrl);

  // New category form
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // Item modal
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>();
  const [showItemModal, setShowItemModal] = useState(false);

  async function loadCategories() {
    try {
      const [cats, venue] = await Promise.all([
        getCategories(venueId),
        getVenueById(venueId),
      ]);
      setCategories(cats);
      if (!activeCatId && cats.length > 0) {
        setActiveCatId(cats[0].id);
      }
      if (venue.menu_image_url) {
        setCurrentMenuImageUrl(venue.menu_image_url);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  const activeCategory = categories.find(c => c.id === activeCatId);
  const items = activeCategory?.items ?? [];

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const cat = await createCategory(venueId, { name: newCatName.trim(), display_order: categories.length });
      setCategories(prev => [...prev, { ...cat, items: [] }]);
      setActiveCatId(cat.id);
      setNewCatName('');
      setShowNewCat(false);
    } catch { /* ignore */ } finally {
      setCreatingCat(false);
    }
  }

  async function handleDeleteCategory(catId: string) {
    try {
      await deleteCategory(venueId, catId);
      setCategories(prev => prev.filter(c => c.id !== catId));
      if (activeCatId === catId) {
        setActiveCatId(categories.find(c => c.id !== catId)?.id ?? null);
      }
    } catch { /* ignore */ }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deleteMenuItem(venueId, itemId);
      await loadCategories();
    } catch { /* ignore */ }
  }

  function handleItemSaved() {
    setShowItemModal(false);
    setEditingItem(undefined);
    loadCategories();
  }

  if (loading) {
    return (
      <section>
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-48 rounded-xl" />
      </section>
    );
  }

  const hasMenu = categories.length > 0 && categories.some(c => c.items && c.items.length > 0);

  // Hide section only for non-community venues that have no menu
  if (!hasMenu && !isCommunityContributed) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UtensilsCrossed size={22} />
          Menu
        </h2>
        {canEdit && (
          <button
            onClick={() => setEditMode(!editMode)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              editMode
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            )}
          >
            <Pencil size={12} />
            {editMode ? 'Xong' : 'Chỉnh sửa menu'}
          </button>
        )}
      </div>

      {/* Menu image */}
      {currentMenuImageUrl && (
        <div className="mb-5">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
            <img src={currentMenuImageUrl} alt="Ảnh menu" className="w-full object-contain max-h-[500px]" />
          </div>
        </div>
      )}

      {/* AI Menu Analyzer (edit mode) */}
      {editMode && <MenuImageAnalyzer venueId={venueId} onSaved={loadCategories} />}

      {/* Add category (edit mode) */}
      {editMode && (
        <div className="mb-4">
          {showNewCat ? (
            <div className="flex items-center gap-2">
              <input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                placeholder="Tên danh mục mới..."
                className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#e9590c]/30 focus:border-[#e9590c] transition-all"
                autoFocus
              />
              <button onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()} className="p-2 bg-[#e9590c] text-white rounded-lg disabled:opacity-50">
                <Check size={16} />
              </button>
              <button onClick={() => { setShowNewCat(false); setNewCatName(''); }} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCat(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-[#e9590c] hover:underline"
            >
              <FolderPlus size={16} /> Thêm danh mục
            </button>
          )}
        </div>
      )}

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveCatId(cat.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  activeCatId === cat.id
                    ? 'bg-[#e9590c] text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                )}
              >
                {cat.name} ({cat.items?.length ?? 0})
              </button>
              {editMode && (
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                  title="Xóa danh mục"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Items */}
      {activeCategory && (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          {editMode && (
            <div className="flex items-center justify-end px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <button
                onClick={() => { setEditingItem(undefined); setShowItemModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e9590c] text-white font-bold rounded-lg text-xs hover:bg-[#c2410b] transition-colors"
              >
                <Plus size={14} /> Thêm món
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <UtensilsCrossed size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Chưa có món nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                  {item.image_url ? (
                    <div className="size-14 rounded-lg overflow-hidden shrink-0 border border-slate-100 dark:border-slate-600">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="size-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <ImageIcon size={18} className="text-slate-300 dark:text-slate-500" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white truncate text-sm">{item.name}</h4>
                      {!item.is_available && (
                        <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-500 text-[10px] font-bold rounded-full">Hết hàng</span>
                      )}
                    </div>
                    <p className="text-[#e9590c] font-bold text-sm mt-0.5">{formatPrice(item.price)}</p>
                  </div>

                  {editMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingItem(item); setShowItemModal(true); }}
                        className="p-2 text-slate-400 hover:text-[#e9590c] hover:bg-[#e9590c]/5 rounded-lg transition-colors"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state — no categories yet */}
      {categories.length === 0 && (
        <div className="py-10 text-center text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
          <UtensilsCrossed size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">
            {canEdit ? 'Chưa có menu. Thêm danh mục đầu tiên.' : 'Chưa có menu.'}
          </p>
          {isCommunityContributed && !user && (
            <p className="text-xs mt-1">Đăng nhập để đóng góp menu cho địa điểm này.</p>
          )}
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <ItemModal
          venueId={venueId}
          categories={categories}
          item={editingItem}
          onClose={() => { setShowItemModal(false); setEditingItem(undefined); }}
          onSaved={handleItemSaved}
        />
      )}
    </section>
  );
}
