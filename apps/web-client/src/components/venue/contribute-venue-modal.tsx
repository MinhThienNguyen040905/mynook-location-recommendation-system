'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  X, MapPin, Upload, Trash2,
  ChevronRight, ChevronLeft, Check, SendHorizonal, Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { createCommunityVenue } from '@/lib/api/venues';
import { uploadMedia } from '@/lib/api/upload';
import { listCities, listDistricts } from '@/lib/api/locations';
import { CategoryPickerChips } from '@/components/venue/category-picker-chips';
import type { UploadResult } from '@/lib/api/upload';
import type { City, District, CreateVenueRequest } from '@/types/venue';

const LocationPickerMap = dynamic(
  () => import('../dashboard/location-picker-map').then((m) => m.LocationPickerMap),
  { ssr: false, loading: () => <div className="h-[280px] rounded-xl bg-gray-100 animate-pulse" /> },
);

/* ── Types ────────────────────────────────────────────────────── */
interface MediaItem {
  file?: File;
  url: string;
  preview: string;
  uploading?: boolean;
}

interface FormData {
  name: string;
  address_line: string;
  ward: string;
  city_id: string;
  district_id: string;
  description: string;
  latitude: number;
  longitude: number;
  total_capacity: string;
  max_group_size: string;
  is_group_friendly: boolean;
  openTime: string;
  closeTime: string;
  mediaItems: MediaItem[];
  category_ids: string[];
  primary_category_id: string | null;
}

const EMPTY_FORM: FormData = {
  name: '', address_line: '', ward: '', city_id: '', district_id: '',
  description: '', latitude: 0, longitude: 0,
  total_capacity: '50', max_group_size: '10', is_group_friendly: false,
  openTime: '08:00', closeTime: '22:00',
  mediaItems: [],
  category_ids: [], primary_category_id: null,
};

const STEPS = ['Thông tin quán', 'Vị trí', 'Chi tiết thêm'];
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';

/* ── Step indicator ───────────────────────────────────────────── */
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              'size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < current ? 'bg-[#e9590c] text-white'
              : i === current ? 'bg-[#e9590c] text-white ring-4 ring-[#e9590c]/20'
              : 'bg-gray-100 text-gray-400'
            )}>
              {i < current ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn(
              'text-[10px] font-medium whitespace-nowrap hidden sm:block',
              i <= current ? 'text-[#e9590c]' : 'text-gray-400'
            )}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('h-0.5 flex-1 mx-2 rounded-full transition-all', i < current ? 'bg-[#e9590c]' : 'bg-gray-100')} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Step 1: Thông tin quán ───────────────────────────────────── */
function Step1({ form, set }: { form: FormData; set: (f: Partial<FormData>) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newItems: MediaItem[] = Array.from(files).map((file) => ({
      file, url: '', preview: URL.createObjectURL(file),
    }));
    set({ mediaItems: [...form.mediaItems, ...newItems] });
    e.target.value = '';
  }

  function removeMedia(index: number) {
    const item = form.mediaItems[index];
    if (item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview);
    set({ mediaItems: form.mediaItems.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên quán *</label>
        <input value={form.name} onChange={e => set({ name: e.target.value })}
          placeholder="VD: The Quiet Corner" className="nook-input" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mô tả</label>
        <textarea rows={2} value={form.description} onChange={e => set({ description: e.target.value })}
          placeholder="Mô tả ngắn về quán..."
          className="nook-input resize-none" />
      </div>

      <CategoryPickerChips
        selectedIds={form.category_ids}
        primaryId={form.primary_category_id}
        onChange={(ids, primary) => set({ category_ids: ids, primary_category_id: primary })}
        tone="orange"
      />

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ảnh (không bắt buộc)</label>
        {form.mediaItems.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {form.mediaItems.map((item, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-100 aspect-square bg-gray-50">
                <img src={item.preview} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeMedia(i)}
                  className="absolute top-1 right-1 size-5 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#e9590c]/50 hover:text-[#e9590c] transition-colors">
          <Upload size={16} /> Chọn ảnh
        </button>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} onChange={handleFileSelect} className="hidden" />
      </div>
    </div>
  );
}

/* ── Step 2: Vị trí ───────────────────────────────────────────── */
function Step2({
  form,
  set,
  cities,
  districts,
  loadingCities,
  loadingDistricts,
}: {
  form: FormData;
  set: (f: Partial<FormData>) => void;
  cities: City[];
  districts: District[];
  loadingCities: boolean;
  loadingDistricts: boolean;
}) {
  const handleLocationChange = useCallback(
    (lat: number, lng: number) => set({ latitude: lat, longitude: lng }),
    [set],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Địa chỉ (số nhà + đường) *</label>
        <input value={form.address_line} onChange={e => set({ address_line: e.target.value })}
          placeholder="VD: 123 Nguyễn Huệ" className="nook-input" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phường/Xã</label>
        <input value={form.ward} onChange={e => set({ ward: e.target.value })}
          placeholder="VD: Phường Bến Nghé" className="nook-input" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thành phố *</label>
          <select
            value={form.city_id}
            onChange={e => set({ city_id: e.target.value, district_id: '' })}
            disabled={loadingCities}
            className="nook-input"
          >
            <option value="">{loadingCities ? 'Đang tải...' : '— Chọn —'}</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quận/Huyện *</label>
          <select
            value={form.district_id}
            onChange={e => set({ district_id: e.target.value })}
            disabled={!form.city_id || loadingDistricts}
            className="nook-input"
          >
            <option value="">
              {!form.city_id ? 'Chọn TP trước' : loadingDistricts ? 'Đang tải...' : '— Chọn —'}
            </option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin size={14} /> Chọn trên bản đồ *
        </label>
        <LocationPickerMap latitude={form.latitude} longitude={form.longitude} onChange={handleLocationChange} />
      </div>
    </div>
  );
}

/* ── Step 3: Chi tiết thêm ────────────────────────────────────── */
function Step3({ form, set }: { form: FormData; set: (f: Partial<FormData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giờ mở cửa</label>
          <input type="time" value={form.openTime} onChange={e => set({ openTime: e.target.value })} className="nook-input" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giờ đóng cửa</label>
          <input type="time" value={form.closeTime} onChange={e => set({ closeTime: e.target.value })} className="nook-input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sức chứa</label>
          <input type="number" min={1} value={form.total_capacity} onChange={e => set({ total_capacity: e.target.value })}
            placeholder="50" className="nook-input" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nhóm tối đa</label>
          <input type="number" min={1} value={form.max_group_size} onChange={e => set({ max_group_size: e.target.value })}
            placeholder="10" className="nook-input" />
        </div>
      </div>

      <label className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-[#e9590c]/20 cursor-pointer transition-all">
        <div className={cn(
          'size-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0',
          form.is_group_friendly ? 'bg-[#e9590c] border-[#e9590c]' : 'border-gray-300',
        )}>
          {form.is_group_friendly && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
        <input type="checkbox" checked={form.is_group_friendly} onChange={e => set({ is_group_friendly: e.target.checked })} className="sr-only" />
        <span className="text-sm font-medium text-gray-700">Phù hợp cho nhóm đông</span>
      </label>
    </div>
  );
}

/* ── Validate ─────────────────────────────────────────────────── */
function isStepValid(step: number, form: FormData) {
  if (step === 0) {
    return form.name.trim() !== '' && form.category_ids.length > 0;
  }
  if (step === 1) {
    return (
      form.address_line.trim() !== '' &&
      form.city_id !== '' &&
      form.district_id !== '' &&
      form.latitude !== 0 &&
      form.longitude !== 0
    );
  }
  return true;
}

/* ── Main Modal ───────────────────────────────────────────────── */
export function ContributeVenueModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setFormState] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listCities()
      .then((data) => { if (!cancelled) setCities(data); })
      .finally(() => { if (!cancelled) setLoadingCities(false); });
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

  function set(partial: Partial<FormData>) {
    setFormState(prev => ({ ...prev, ...partial }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      let mediaUrls: string[] = [];
      const filesToUpload = form.mediaItems.filter((item) => item.file);

      if (filesToUpload.length > 0) {
        const results: UploadResult[] = await uploadMedia(filesToUpload.map((item) => item.file!));
        mediaUrls = results.map((r) => r.url);
      }

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const opening_hours: Record<string, { open: string; close: string }> = {};
      for (const day of days) {
        opening_hours[day] = { open: form.openTime, close: form.closeTime };
      }

      const body: CreateVenueRequest = {
        name: form.name.trim(),
        address_line: form.address_line.trim(),
        ward: form.ward.trim() || undefined,
        city_id: form.city_id,
        district_id: form.district_id,
        latitude: form.latitude,
        longitude: form.longitude,
        description: form.description.trim() || undefined,
        total_capacity: form.total_capacity ? parseInt(form.total_capacity) : undefined,
        max_group_size: form.max_group_size ? parseInt(form.max_group_size) : undefined,
        is_group_friendly: form.is_group_friendly,
        media: mediaUrls.length > 0 ? mediaUrls : undefined,
        opening_hours,
        category_ids: form.category_ids,
        primary_category_id: form.primary_category_id ?? undefined,
      };

      await createCommunityVenue(body);
      setSubmitted(true);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const isLast = step === STEPS.length - 1;
  const canNext = isStepValid(step, form);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
              <Heart size={18} className="text-[#e9590c]" />
              Đóng góp địa điểm
            </h2>
            {!submitted && (
              <p className="text-xs text-gray-400 mt-0.5">
                Giúp cộng đồng khám phá thêm địa điểm hay
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="size-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Check size={36} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cảm ơn bạn!</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8">
                Quán <span className="font-bold text-gray-700 dark:text-white">&quot;{form.name}&quot;</span> đã được thêm vào hệ thống.
                Mọi người đều có thể cập nhật thông tin cho quán này.
              </p>
              <button onClick={onClose} className="px-8 py-3 bg-[#e9590c] text-white font-bold rounded-xl hover:bg-[#c2410b] transition-colors">
                Đóng
              </button>
            </motion.div>
          ) : (
            <>
              <StepBar current={step} />
              <AnimatePresence mode="wait">
                <motion.div key={step}
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  {step === 0 && <Step1 form={form} set={set} />}
                  {step === 1 && (
                    <Step2
                      form={form}
                      set={set}
                      cities={cities}
                      districts={districts}
                      loadingCities={loadingCities}
                      loadingDistricts={loadingDistricts}
                    />
                  )}
                  {step === 2 && <Step3 form={form} set={set} />}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 space-y-2">
            {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} /> Quay lại
              </button>

              {isLast ? (
                <button onClick={handleSubmit} disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#e9590c] text-white font-bold rounded-xl hover:bg-[#c2410b] transition-colors disabled:opacity-60 text-sm">
                  {loading
                    ? <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <SendHorizonal size={15} />}
                  {loading ? 'Đang tải...' : 'Đóng góp'}
                </button>
              ) : (
                <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[#e9590c] text-white font-bold rounded-xl hover:bg-[#c2410b] transition-colors disabled:opacity-40 text-sm">
                  Tiếp theo <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
