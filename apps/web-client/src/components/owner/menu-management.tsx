'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus, Edit3, Trash2, FolderPlus, Info,
  Check, X, Image as ImageIcon, Sparkles, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{item ? 'Sửa món' : 'Thêm món mới'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên món *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Cà phê sữa đá" className="nook-input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giá (VNĐ) *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="35000" className="nook-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Danh mục *</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="nook-input">
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ảnh món</label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="size-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              >
                {uploading
                  ? <span className="size-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                  : <ImageIcon size={16} />}
                {uploading ? 'Đang tải...' : 'Chọn ảnh'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)}
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm text-gray-700">Còn bán</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700">Hủy</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !price || !categoryId}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {item ? 'Lưu' : 'Thêm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Menu Image Analyzer ──────────────────────────────── */
function MenuImageAnalyzer({
  venueId,
  onSaved,
}: {
  venueId: string;
  onSaved: () => void;
}) {
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
        ? {
            ...c,
            items: c.items.map((item, ii) =>
              ii === itemIdx
                ? { ...item, [field]: field === 'price' ? parseFloat(value) || 0 : value }
                : item,
            ),
          }
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
    <div className="p-6 bg-white rounded-2xl border border-primary/10 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles size={20} className="text-primary" />
        <h3 className="text-lg font-bold text-gray-900">Nhận diện menu từ ảnh (AI)</h3>
      </div>

      <p className="text-sm text-gray-500">
        Tải ảnh menu của quán lên, AI sẽ tự động nhận diện các danh mục và món. Bạn có thể chỉnh sửa trước khi lưu.
      </p>

      {/* Upload area */}
      <div className="flex items-start gap-4">
        {imageUrl ? (
          <div className="w-48 rounded-xl overflow-hidden border border-gray-200 shrink-0">
            <img src={imageUrl} alt="Menu" className="w-full object-contain max-h-64" />
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || analyzing}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {uploading
              ? <Loader2 size={16} className="animate-spin" />
              : <ImageIcon size={16} />}
            {uploading ? 'Đang tải ảnh...' : imageUrl ? 'Đổi ảnh khác' : 'Chọn ảnh menu'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />

          {imageUrl && !results && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {analyzing
                ? <Loader2 size={16} className="animate-spin" />
                : <Sparkles size={16} />}
              {analyzing ? 'Đang phân tích...' : 'Phân tích bằng AI'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
      )}

      {/* Editable results */}
      {results && results.length > 0 && (
        <div className="space-y-4 border-t border-gray-100 pt-5">
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Kết quả nhận diện — Chỉnh sửa nếu cần
          </h4>

          {results.map((cat, catIdx) => (
            <div key={catIdx} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Category header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                <input
                  value={cat.name}
                  onChange={e => updateCategoryName(catIdx, e.target.value)}
                  className="flex-1 bg-transparent font-bold text-gray-900 text-sm outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1"
                />
                <button
                  onClick={() => removeCategory(catIdx)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Xóa danh mục"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-100">
                {cat.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-center gap-3 px-4 py-2.5">
                    <input
                      value={item.name}
                      onChange={e => updateItemField(catIdx, itemIdx, 'name', e.target.value)}
                      className="flex-1 text-sm text-gray-800 bg-transparent outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1"
                      placeholder="Tên món"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={e => updateItemField(catIdx, itemIdx, 'price', e.target.value)}
                        className="w-28 text-sm text-right text-primary font-bold bg-transparent outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1"
                        placeholder="Giá"
                      />
                      <span className="text-xs text-gray-400">VNĐ</span>
                    </div>
                    <button
                      onClick={() => removeItem(catIdx, itemIdx)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => { setResults(null); setImageUrl(''); }}
              className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Xác nhận & Lưu menu
            </button>
          </div>
        </div>
      )}

      {results && results.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Không tìm thấy món nào trong ảnh. Vui lòng thử với ảnh menu khác.
        </p>
      )}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */
export function MenuManagement({ venueId: venueIdProp }: { venueId?: string } = {}) {
  const searchParams = useSearchParams();
  const venueId = venueIdProp ?? searchParams.get('id');

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);

  // New category form
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // Item modal
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>();
  const [showItemModal, setShowItemModal] = useState(false);

  async function loadCategories() {
    if (!venueId) return;
    try {
      const cats = await getCategories(venueId);
      setCategories(cats);
      if (!activeCatId && cats.length > 0) {
        setActiveCatId(cats[0].id);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  if (!venueId) {
    return (
      <div className="py-16 text-center text-gray-400">
        <Info size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">Chọn một venue từ dashboard để quản lý menu</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const activeCategory = categories.find(c => c.id === activeCatId);
  const items = activeCategory?.items ?? [];

  async function handleCreateCategory() {
    if (!newCatName.trim() || !venueId) return;
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
    if (!venueId) return;
    try {
      await deleteCategory(venueId, catId);
      setCategories(prev => prev.filter(c => c.id !== catId));
      if (activeCatId === catId) {
        setActiveCatId(categories.find(c => c.id !== catId)?.id ?? null);
      }
    } catch { /* ignore */ }
  }

  async function handleDeleteItem(itemId: string) {
    if (!venueId) return;
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

  return (
    <div className="space-y-8">

      {/* Menu Image Analyzer */}
      <MenuImageAnalyzer venueId={venueId} onSaved={loadCategories} />

      {/* Categories bar */}
      <div className="p-6 bg-white rounded-2xl border border-primary/10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Danh mục</h3>
          <button
            onClick={() => setShowNewCat(true)}
            className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
          >
            <FolderPlus size={16} /> Thêm danh mục
          </button>
        </div>

        {showNewCat && (
          <div className="flex items-center gap-2 mb-4">
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
              placeholder="Tên danh mục mới..."
              className="nook-input flex-1"
              autoFocus
            />
            <button
              onClick={handleCreateCategory}
              disabled={creatingCat || !newCatName.trim()}
              className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-50"
            >
              <Check size={16} />
            </button>
            <button onClick={() => { setShowNewCat(false); setNewCatName(''); }} className="p-2.5 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        )}

        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Chưa có danh mục nào. Thêm danh mục đầu tiên.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveCatId(cat.id)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    activeCatId === cat.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {cat.name} ({cat.items?.length ?? 0})
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                  title="Xóa danh mục"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Items list */}
      {activeCategory && (
        <div className="p-6 bg-white rounded-2xl border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900">
              {activeCategory.name} <span className="text-gray-400 font-normal text-sm">({items.length} món)</span>
            </h3>
            <button
              onClick={() => { setEditingItem(undefined); setShowItemModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors"
            >
              <Plus size={16} /> Thêm món
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="font-medium">Chưa có món nào trong danh mục này</p>
              <p className="text-xs mt-1">Thêm món đầu tiên</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-primary/20 transition-all"
                >
                  {item.image_url ? (
                    <div className="size-16 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="size-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <ImageIcon size={20} className="text-gray-300" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                      {!item.is_available && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded-full">Hết hàng</span>
                      )}
                    </div>
                    <p className="text-primary font-bold text-sm mt-0.5">{formatPrice(item.price)}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingItem(item); setShowItemModal(true); }}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  );
}
