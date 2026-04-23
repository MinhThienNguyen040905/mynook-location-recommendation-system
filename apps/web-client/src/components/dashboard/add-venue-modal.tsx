'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  X, MapPin, Upload, Trash2,
  ChevronRight, ChevronLeft, Check, SendHorizonal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { createVenue } from '@/lib/api/venues';
import { uploadMedia } from '@/lib/api/upload';
import type { UploadResult } from '@/lib/api/upload';
import type { CreateVenueRequest } from '@/types/venue';

// Lazy-load Leaflet map (no SSR)
const LocationPickerMap = dynamic(
  () => import('./location-picker-map').then((m) => m.LocationPickerMap),
  { ssr: false, loading: () => <div className="h-[280px] rounded-xl bg-gray-100 animate-pulse" /> },
);

/* ── Types ───────────────────────────────────────────────────── */
interface MediaItem {
  file?: File;
  url: string;
  preview: string;
  uploading?: boolean;
}

interface FormData {
  name: string;
  branch_name: string;
  address: string;
  city: string;
  district: string;
  description: string;
  latitude: number;
  longitude: number;
  total_capacity: string;
  max_group_size: string;
  is_group_friendly: boolean;
  openTime: string;
  closeTime: string;
  owner_amenities: string[];
  mediaItems: MediaItem[];
}

const EMPTY_FORM: FormData = {
  name: '', branch_name: '', address: '', city: 'Ho Chi Minh', district: '',
  description: '', latitude: 0, longitude: 0,
  total_capacity: '50', max_group_size: '10', is_group_friendly: false,
  openTime: '08:00', closeTime: '22:00',
  owner_amenities: [], mediaItems: [],
};

const AMENITIES = [
  'Wi-Fi tốc độ cao', 'Ổ cắm điện', 'Khu vực yên tĩnh', 'Chỗ ngồi ngoài trời',
  'Thân thiện thú cưng', 'Phòng riêng', 'Máy lạnh', 'Ánh sáng tự nhiên',
  'Phòng họp', 'Bãi đỗ xe',
];

const STEPS = ['Thông tin cơ bản', 'Vị trí & Sức chứa', 'Giờ mở cửa & Tiện ích', 'Xác nhận'];
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';

/* ── Step indicator ──────────────────────────────────────────── */
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              'size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < current  ? 'bg-nook-olive text-white'
              : i === current ? 'bg-nook-olive text-white ring-4 ring-nook-olive/20'
              : 'bg-gray-100 text-gray-400'
            )}>
              {i < current ? <Check size={14} /> : i + 1}
            </div>
            <span className={cn(
              'text-[10px] font-medium whitespace-nowrap hidden sm:block',
              i <= current ? 'text-nook-olive' : 'text-gray-400'
            )}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('h-0.5 flex-1 mx-2 rounded-full transition-all', i < current ? 'bg-nook-olive' : 'bg-gray-100')} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Step 1: Thông tin cơ bản ────────────────────────────────── */
function Step1({ form, set }: { form: FormData; set: (f: Partial<FormData>) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newItems: MediaItem[] = Array.from(files).map((file) => ({
      file,
      url: '',
      preview: URL.createObjectURL(file),
    }));

    set({ mediaItems: [...form.mediaItems, ...newItems] });

    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function removeMedia(index: number) {
    const item = form.mediaItems[index];
    if (item.preview.startsWith('blob:')) {
      URL.revokeObjectURL(item.preview);
    }
    set({ mediaItems: form.mediaItems.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên quán *</label>
        <input value={form.name} onChange={e => set({ name: e.target.value })}
          placeholder="VD: The Quiet Corner" className="nook-input" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên chi nhánh</label>
        <input value={form.branch_name} onChange={e => set({ branch_name: e.target.value })}
          placeholder="VD: Chi nhánh Quận 1 (bỏ trống nếu chỉ có 1 cơ sở)" className="nook-input" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mô tả *</label>
        <textarea rows={3} value={form.description} onChange={e => set({ description: e.target.value })}
          placeholder="Mô tả không gian, phong cách, điểm nổi bật..."
          className="nook-input resize-none" />
      </div>

      {/* Media upload */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ảnh / Video</label>

        {/* Preview grid */}
        {form.mediaItems.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {form.mediaItems.map((item, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-100 aspect-square bg-gray-50">
                {item.file?.type.startsWith('video/') ? (
                  <video src={item.preview} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.preview} alt="" className="w-full h-full object-cover" />
                )}
                {item.uploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="size-5 border-2 border-nook-olive/40 border-t-nook-olive rounded-full animate-spin" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(i)}
                  className="absolute top-1 right-1 size-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-nook-olive/50 hover:text-nook-olive transition-colors"
        >
          <Upload size={16} />
          Chọn ảnh hoặc video từ máy
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />
        <p className="text-xs text-gray-400">JPG, PNG, WebP, MP4. Tối đa 10 file.</p>
      </div>
    </div>
  );
}

/* ── Step 2: Vị trí & Sức chứa ──────────────────────────────── */
function Step2({ form, set }: { form: FormData; set: (f: Partial<FormData>) => void }) {
  const handleLocationChange = useCallback(
    (lat: number, lng: number) => set({ latitude: lat, longitude: lng }),
    [set],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Địa chỉ *</label>
        <input value={form.address} onChange={e => set({ address: e.target.value })}
          placeholder="Số nhà, tên đường" className="nook-input" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quận/Huyện</label>
          <input value={form.district} onChange={e => set({ district: e.target.value })}
            placeholder="VD: Quận 1" className="nook-input" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thành phố</label>
          <input value={form.city} onChange={e => set({ city: e.target.value })}
            placeholder="Ho Chi Minh" className="nook-input" />
        </div>
      </div>

      {/* Map location picker */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin size={14} /> Vị trí trên bản đồ *
        </label>
        <LocationPickerMap
          latitude={form.latitude}
          longitude={form.longitude}
          onChange={handleLocationChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sức chứa tổng</label>
          <input type="number" value={form.total_capacity}
            onChange={e => set({ total_capacity: e.target.value })}
            placeholder="50" className="nook-input" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nhóm tối đa</label>
          <input type="number" value={form.max_group_size}
            onChange={e => set({ max_group_size: e.target.value })}
            placeholder="10" className="nook-input" />
        </div>
      </div>

      <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-nook-olive/20 cursor-pointer transition-all">
        <input type="checkbox" checked={form.is_group_friendly}
          onChange={e => set({ is_group_friendly: e.target.checked })}
          className="size-5 rounded border-gray-300 text-nook-olive focus:ring-nook-olive" />
        <span className="text-sm font-medium text-gray-700">Phù hợp cho nhóm đông</span>
      </label>
    </div>
  );
}

/* ── Step 3: Giờ mở cửa & Tiện ích ──────────────────────────── */
function Step3({ form, set }: { form: FormData; set: (f: Partial<FormData>) => void }) {
  function toggleAmenity(a: string) {
    const next = form.owner_amenities.includes(a)
      ? form.owner_amenities.filter(x => x !== a)
      : [...form.owner_amenities, a];
    set({ owner_amenities: next });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giờ mở cửa</label>
          <input type="time" value={form.openTime}
            onChange={e => set({ openTime: e.target.value })}
            className="nook-input" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giờ đóng cửa</label>
          <input type="time" value={form.closeTime}
            onChange={e => set({ closeTime: e.target.value })}
            className="nook-input" />
        </div>
      </div>
      <p className="text-xs text-gray-400">Áp dụng cho tất cả các ngày. Bạn có thể chỉnh sửa chi tiết sau.</p>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tiện ích của quán</label>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map(a => (
            <button key={a} type="button" onClick={() => toggleAmenity(a)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                form.owner_amenities.includes(a)
                  ? 'bg-nook-olive text-white border-nook-olive'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-nook-olive/50'
              )}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 4: Xác nhận ────────────────────────────────────────── */
function Step4({ form }: { form: FormData }) {
  const rows: [string, string][] = [
    ['Tên quán',       form.name],
    ['Chi nhánh',      form.branch_name || '—'],
    ['Địa chỉ',       [form.address, form.district, form.city].filter(Boolean).join(', ')],
    ['Tọa độ',        form.latitude && form.longitude ? `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}` : '—'],
    ['Giờ mở cửa',    `${form.openTime} – ${form.closeTime}`],
    ['Sức chứa',      `${form.total_capacity} người (nhóm tối đa ${form.max_group_size})` ],
    ['Nhóm đông',     form.is_group_friendly ? 'Có' : 'Không'],
    ['Tiện ích',      form.owner_amenities.join(', ') || '—'],
    ['Media',         form.mediaItems.length > 0 ? `${form.mediaItems.length} file` : '—'],
  ];

  return (
    <div className="space-y-5">
      {/* Media preview thumbnails */}
      {form.mediaItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {form.mediaItems.map((item, i) => (
            <div key={i} className="shrink-0 w-24 h-20 rounded-lg overflow-hidden border border-gray-100">
              {item.file?.type.startsWith('video/') ? (
                <video src={item.preview} className="w-full h-full object-cover" muted />
              ) : (
                <img src={item.preview} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between px-4 py-3 gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide shrink-0">{label}</span>
            <span className="text-sm text-gray-700 text-right">{value}</span>
          </div>
        ))}
      </div>

      {form.description && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Mô tả</p>
          <p className="text-sm text-gray-600 leading-relaxed">{form.description}</p>
        </div>
      )}
    </div>
  );
}

/* ── Success screen ──────────────────────────────────────────── */
function SuccessScreen({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-8 text-center"
    >
      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
        <Check size={36} className="text-green-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Tạo venue thành công!</h3>
      <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8">
        Quán <span className="font-bold text-gray-700">"{name}"</span> đã được tạo. Bạn có thể quản lý chi tiết tại trang Dashboard.
      </p>
      <button onClick={onClose}
        className="nook-button-primary px-8 py-3 font-bold">
        Đóng
      </button>
    </motion.div>
  );
}

/* ── Validate each step ──────────────────────────────────────── */
function isStepValid(step: number, form: FormData) {
  if (step === 0) return form.name.trim() !== '' && form.description.trim() !== '';
  if (step === 1) return form.address.trim() !== '' && form.latitude !== 0 && form.longitude !== 0;
  return true;
}

/* ── Main Modal ──────────────────────────────────────────────── */
export function AddVenueModal({ onClose }: { onClose: () => void }) {
  const [step, setStep]       = useState(0);
  const [form, setFormState]  = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function set(partial: Partial<FormData>) {
    setFormState(prev => ({ ...prev, ...partial }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Upload media files to Cloudinary
      let mediaUrls: string[] = [];
      const filesToUpload = form.mediaItems.filter((item) => item.file);

      if (filesToUpload.length > 0) {
        // Mark items as uploading
        set({
          mediaItems: form.mediaItems.map((item) =>
            item.file ? { ...item, uploading: true } : item,
          ),
        });

        const results: UploadResult[] = await uploadMedia(
          filesToUpload.map((item) => item.file!),
        );
        mediaUrls = results.map((r) => r.url);
      }

      // Step 2: Build opening_hours
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const opening_hours: Record<string, { open: string; close: string }> = {};
      for (const day of days) {
        opening_hours[day] = { open: form.openTime, close: form.closeTime };
      }

      // Step 3: Create venue
      const body: CreateVenueRequest = {
        name: form.name.trim(),
        address: form.address.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        description: form.description.trim() || undefined,
        branch_name: form.branch_name.trim() || undefined,
        city: form.city.trim() || undefined,
        district: form.district.trim() || undefined,
        total_capacity: form.total_capacity ? parseInt(form.total_capacity) : undefined,
        max_group_size: form.max_group_size ? parseInt(form.max_group_size) : undefined,
        is_group_friendly: form.is_group_friendly,
        media: mediaUrls.length > 0 ? mediaUrls : undefined,
        opening_hours,
        owner_amenities: form.owner_amenities.length > 0 ? form.owner_amenities : undefined,
      };

      await createVenue(body);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const isLast  = step === STEPS.length - 1;
  const canNext = isStepValid(step, form);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Thêm Venue mới</h2>
            {!submitted && <p className="text-xs text-gray-400 mt-0.5">Điền thông tin quán của bạn</p>}
          </div>
          <button onClick={onClose}
            className="size-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitted ? (
            <SuccessScreen name={form.name} onClose={onClose} />
          ) : (
            <>
              <StepBar current={step} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  {step === 0 && <Step1 form={form} set={set} />}
                  {step === 1 && <Step2 form={form} set={set} />}
                  {step === 2 && <Step3 form={form} set={set} />}
                  {step === 3 && <Step4 form={form} />}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="px-6 py-4 border-t border-gray-100 shrink-0 space-y-3">
            {error && (
              <p className="text-sm text-red-500 font-medium text-center">{error}</p>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} /> Quay lại
              </button>

              {isLast ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-nook-olive text-white font-bold rounded-xl hover:bg-nook-olive/90 transition-colors disabled:opacity-60 text-sm"
                >
                  {loading
                    ? <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <SendHorizonal size={15} />}
                  {loading ? 'Đang tải...' : 'Tạo Venue'}
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-nook-olive text-white font-bold rounded-xl hover:bg-nook-olive/90 transition-colors disabled:opacity-40 text-sm"
                >
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
