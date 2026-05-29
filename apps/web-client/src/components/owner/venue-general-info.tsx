'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Info, Image as ImageIcon, Trash2,
  MapPin, Clock, Plus,
} from 'lucide-react';
import { getVenueById, updateVenue } from '@/lib/api/venues';
import { uploadMedia } from '@/lib/api/upload';
import { listCities, listDistricts } from '@/lib/api/locations';
import { CategoryPickerChips } from '@/components/venue/category-picker-chips';
import { Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { City, District, Venue } from '@/types/venue';

interface FormState {
  name: string;
  address_line: string;
  ward: string;
  city_id: string;
  district_id: string;
  description: string;
  opening_hours: Record<string, { open: string; close: string }>;
  category_ids: string[];
  primary_category_id: string | null;
}

function formFromVenue(v: Venue): FormState {
  const cats = v.categories ?? [];
  // Prefer backend-provided primary_category_id; fall back to the category
  // flagged is_primary, then to the first one (matches getCategoriesForVenue
  // ordering which puts primary first).
  const primaryId =
    v.primary_category_id ??
    cats.find((c) => c.is_primary)?.id ??
    cats[0]?.id ??
    null;
  return {
    name: v.name ?? '',
    address_line: v.address_line ?? '',
    ward: v.ward ?? '',
    city_id: v.city_id ?? '',
    district_id: v.district_id ?? '',
    description: v.description ?? '',
    opening_hours: v.opening_hours ?? {},
    category_ids: cats.map((c) => c.id),
    primary_category_id: primaryId,
  };
}

export function VenueGeneralInfo() {
  const searchParams = useSearchParams();
  const venueId = searchParams.get('id');

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    address_line: '',
    ward: '',
    city_id: '',
    district_id: '',
    description: '',
    opening_hours: {},
    category_ids: [],
    primary_category_id: null,
  });

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listCities().then((data) => { if (!cancelled) setCities(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!form.city_id) { setDistricts([]); return; }
    let cancelled = false;
    setLoadingDistricts(true);
    listDistricts(form.city_id)
      .then((data) => { if (!cancelled) setDistricts(data); })
      .finally(() => { if (!cancelled) setLoadingDistricts(false); });
    return () => { cancelled = true; };
  }, [form.city_id]);

  useEffect(() => {
    if (!venueId) {
      setLoading(false);
      return;
    }
    getVenueById(venueId)
      .then((v) => {
        setVenue(v);
        setForm(formFromVenue(v));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [venueId]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (!venueId || !venue) {
    return (
      <div className="py-16 text-center text-gray-400">
        <Info size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">Chọn một venue từ dashboard để quản lý</p>
      </div>
    );
  }

  async function handleSave() {
    if (!venueId) return;
    setSaving(true);
    try {
      const updated = await updateVenue(venueId, {
        name: form.name,
        address_line: form.address_line,
        ward: form.ward || undefined,
        city_id: form.city_id || undefined,
        district_id: form.district_id || undefined,
        description: form.description,
        opening_hours: form.opening_hours,
        category_ids: form.category_ids,
        primary_category_id: form.primary_category_id ?? undefined,
      });
      // Re-fetch to get eager-loaded categories back into form state
      const full = await getVenueById(venueId);
      setVenue(full);
      setForm(formFromVenue(full));
      void updated;
    } catch {
      // TODO: toast error
    } finally {
      setSaving(false);
    }
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !venueId || !venue) return;
    e.target.value = '';
    setMediaUploading(true);
    try {
      const results = await uploadMedia(Array.from(files));
      const newUrls = results.map((r) => r.url);
      const updatedMedia = [...(venue.media ?? []), ...newUrls];
      const updated = await updateVenue(venueId, { media: updatedMedia });
      setVenue(updated);
    } catch {
      // TODO: toast error
    } finally {
      setMediaUploading(false);
    }
  }

  async function handleMediaRemove(index: number) {
    if (!venueId || !venue) return;
    const updatedMedia = (venue.media ?? []).filter((_, i) => i !== index);
    try {
      const updated = await updateVenue(venueId, { media: updatedMedia });
      setVenue(updated);
    } catch {
      // TODO: toast error
    }
  }

  function handleCancel() {
    if (!venue) return;
    setForm(formFromVenue(venue));
  }

  const hours = form.opening_hours as Record<string, { open: string; close: string }>;

  return (
    <div className="space-y-8">

      {/* Basic Details */}
      <div className="p-8 bg-white rounded-3xl border border-primary/10 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
          <Info className="text-primary size-5" /> Basic Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Venue Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Chi nhánh</label>
            <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-500">
              {venue.branch_name || '—'}
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-slate-700">Address (số nhà + tên đường)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
              <input
                type="text"
                value={form.address_line}
                onChange={e => setForm({ ...form, address_line: e.target.value })}
                placeholder="VD: 123 Nguyễn Huệ"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Phường/Xã</label>
            <input
              type="text"
              value={form.ward}
              onChange={e => setForm({ ...form, ward: e.target.value })}
              placeholder="VD: Phường Bến Nghé"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Thành phố</label>
            <select
              value={form.city_id}
              onChange={e => setForm({ ...form, city_id: e.target.value, district_id: '' })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-slate-50/50"
            >
              <option value="">— Chọn —</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Quận/Huyện</label>
            <select
              value={form.district_id}
              onChange={e => setForm({ ...form, district_id: e.target.value })}
              disabled={!form.city_id || loadingDistricts}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-slate-50/50 disabled:opacity-60"
            >
              <option value="">
                {!form.city_id ? 'Chọn TP trước' : loadingDistricts ? 'Đang tải...' : '— Chọn —'}
              </option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="p-8 bg-white rounded-3xl border border-primary/10 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
          <Tag className="text-primary size-5" /> Loại quán
        </h3>
        <CategoryPickerChips
          selectedIds={form.category_ids}
          primaryId={form.primary_category_id}
          onChange={(ids, primary) => setForm({ ...form, category_ids: ids, primary_category_id: primary })}
          tone="olive"
          label="Phân loại"
          helpText="Venue có thể thuộc nhiều loại. Nhấn ngôi sao để đặt loại chính (hiển thị trên card)."
        />
      </div>

      {/* Photo & Media */}
      <div className="p-8 bg-white rounded-3xl border border-primary/10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <ImageIcon className="text-primary size-5" /> Photo & Media
          </h3>
          <button
            onClick={() => mediaInputRef.current?.click()}
            disabled={mediaUploading}
            className="text-primary text-sm font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {mediaUploading
              ? <span className="size-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              : <Plus className="size-4" />}
            {mediaUploading ? 'Đang tải...' : 'Add Media'}
          </button>
          <input
            ref={mediaInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            onChange={handleMediaUpload}
            className="hidden"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {venue.media && venue.media.length > 0 ? (
            venue.media.map((url, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 group relative">
                <img
                  src={url}
                  alt={`Venue media ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleMediaRemove(i)}
                    className="text-white text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30 hover:bg-red-500/60 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            ))
          ) : null}
          <button
            onClick={() => mediaInputRef.current?.click()}
            disabled={mediaUploading}
            className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            {mediaUploading
              ? <span className="size-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              : <Plus className="size-8" />}
            <span className="text-xs font-bold">{mediaUploading ? 'Đang tải...' : 'Upload'}</span>
          </button>
        </div>
      </div>

      {/* Open Hours */}
      <div className="p-8 bg-white rounded-3xl border border-primary/10 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
          <Clock className="text-primary size-5" /> Open Hours
        </h3>
        <div className="space-y-3">
          {Object.keys(hours).length > 0 ? (
            Object.entries(hours).map(([day, time]) => (
              <div
                key={day}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100"
              >
                <span className="text-sm font-bold text-slate-700 capitalize">{day}</span>
                <span className="text-sm font-medium text-primary">{time.open} – {time.close}</span>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-slate-400 text-sm">
              Chưa thiết lập giờ mở cửa
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-4 pt-4">
        <button
          onClick={handleCancel}
          className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
