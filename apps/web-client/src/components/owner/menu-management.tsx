'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus, Edit3, Trash2, FolderPlus, Info,
  Check, X, Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCategories,
  createCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '@/lib/api/menu';
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

/* ── Main Component ────────────────────────────────────── */
export function MenuManagement() {
  const searchParams = useSearchParams();
  const venueId = searchParams.get('id');

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
