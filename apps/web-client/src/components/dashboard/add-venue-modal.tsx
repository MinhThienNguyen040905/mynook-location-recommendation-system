'use client';

import { useState } from 'react';
import {
  X, Store, MapPin, Clock, DollarSign, Image,
  Phone, ChevronRight, ChevronLeft, Check, SendHorizonal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

/* ── Types ───────────────────────────────────────────────────── */
interface FormData {
  name: string;
  categories: string[];
  address: string;
  description: string;
  openTime: string;
  closeTime: string;
  priceLevel: number;
  features: string[];
  phone: string;
  imageUrl: string;
  note: string;
}

const EMPTY_FORM: FormData = {
  name: '', categories: [], address: '', description: '',
  openTime: '08:00', closeTime: '22:00', priceLevel: 2,
  features: [], phone: '', imageUrl: '', note: '',
};

const CATEGORIES = [
  'Cafe', 'Coworking', 'Library', 'Tea House',
  'Garden', 'Creative Space', 'Study Space', 'Late Night',
];

const FEATURES = [
  'Quiet', 'Fast Wi-Fi', 'Power Outlets', 'Great Coffee',
  'Outdoor Seating', 'Pet Friendly', 'Private Pods',
  'Meeting Rooms', 'Natural Light', 'Air Conditioned',
];

const STEPS = ['Thông tin cơ bản', 'Chi tiết', 'Hình ảnh', 'Xác nhận'];

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
  function toggleCategory(cat: string) {
    const next = form.categories.includes(cat)
      ? form.categories.filter(c => c !== cat)
      : [...form.categories, cat];
    set({ categories: next });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên quán *</label>
        <div className="relative">
          <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={form.name}
            onChange={e => set({ name: e.target.value })}
            placeholder="VD: The Quiet Corner"
            className="nook-input pl-10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Địa chỉ *</label>
        <div className="relative">
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={form.address}
            onChange={e => set({ address: e.target.value })}
            placeholder="Số nhà, đường, quận, thành phố"
            className="nook-input pl-10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mô tả quán *</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => set({ description: e.target.value })}
          placeholder="Mô tả không gian, phong cách, điểm nổi bật..."
          className="nook-input resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loại hình *</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                form.categories.includes(cat)
                  ? 'bg-nook-olive text-white border-nook-olive'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-nook-olive/50'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Chi tiết ────────────────────────────────────────── */
function Step2({ form, set }: { form: FormData; set: (f: Partial<FormData>) => void }) {
  function toggleFeature(f: string) {
    const next = form.features.includes(f)
      ? form.features.filter(x => x !== f)
      : [...form.features, f];
    set({ features: next });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giờ mở cửa</label>
          <div className="relative">
            <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="time" value={form.openTime}
              onChange={e => set({ openTime: e.target.value })}
              className="nook-input pl-10" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giờ đóng cửa</label>
          <div className="relative">
            <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="time" value={form.closeTime}
              onChange={e => set({ closeTime: e.target.value })}
              className="nook-input pl-10" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Mức giá <span className="normal-case font-normal text-gray-400">(1 = rẻ, 4 = cao cấp)</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(p => (
            <button key={p} type="button" onClick={() => set({ priceLevel: p })}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all',
                form.priceLevel === p
                  ? 'bg-nook-olive text-white border-nook-olive'
                  : 'bg-white text-gray-400 border-gray-200 hover:border-nook-olive/40'
              )}>
              {'$'.repeat(p)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tiện ích</label>
        <div className="flex flex-wrap gap-2">
          {FEATURES.map(f => (
            <button key={f} type="button" onClick={() => toggleFeature(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                form.features.includes(f)
                  ? 'bg-nook-olive text-white border-nook-olive'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-nook-olive/50'
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Số điện thoại liên hệ</label>
        <div className="relative">
          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input value={form.phone} onChange={e => set({ phone: e.target.value })}
            placeholder="+84 0xx xxx xxxx" className="nook-input pl-10" />
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Hình ảnh ────────────────────────────────────────── */
function Step3({ form, set }: { form: FormData; set: (f: Partial<FormData>) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">URL ảnh đại diện</label>
        <div className="relative">
          <Image size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input value={form.imageUrl} onChange={e => set({ imageUrl: e.target.value })}
            placeholder="https://..." className="nook-input pl-10" />
        </div>
      </div>

      {form.imageUrl && (
        <div className="rounded-xl overflow-hidden border border-gray-100 aspect-video">
          <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/450'; }} />
        </div>
      )}

      {!form.imageUrl && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 aspect-video flex flex-col items-center justify-center gap-3 text-gray-300">
          <Image size={40} />
          <p className="text-sm">Nhập URL ảnh để xem trước</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ghi chú cho admin</label>
        <textarea rows={3} value={form.note} onChange={e => set({ note: e.target.value })}
          placeholder="Thông tin bổ sung bạn muốn admin biết khi duyệt..."
          className="nook-input resize-none" />
      </div>
    </div>
  );
}

/* ── Step 4: Xác nhận ────────────────────────────────────────── */
function Step4({ form }: { form: FormData }) {
  const rows: [string, string][] = [
    ['Tên quán',    form.name],
    ['Địa chỉ',     form.address],
    ['Loại hình',   form.categories.join(', ') || '—'],
    ['Giờ mở cửa',  `${form.openTime} – ${form.closeTime}`],
    ['Mức giá',     '$'.repeat(form.priceLevel)],
    ['Tiện ích',    form.features.join(', ') || '—'],
    ['Điện thoại',  form.phone || '—'],
  ];

  return (
    <div className="space-y-5">
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-nook-olive font-medium">
        Sau khi gửi, yêu cầu sẽ được chuyển đến admin để xét duyệt.
        Bạn sẽ nhận thông báo khi quán được phê duyệt.
      </div>

      {form.imageUrl && (
        <div className="rounded-xl overflow-hidden border border-gray-100 h-36">
          <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
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
      <h3 className="text-xl font-bold text-gray-900 mb-2">Đã gửi thành công!</h3>
      <p className="text-gray-500 text-sm max-w-xs mx-auto mb-1">
        Yêu cầu thêm quán <span className="font-bold text-gray-700">"{name}"</span> đã được gửi đến admin.
      </p>
      <p className="text-gray-400 text-xs mb-8">Thời gian duyệt thường từ 1–2 ngày làm việc.</p>
      <button onClick={onClose}
        className="nook-button-primary px-8 py-3 font-bold">
        Đóng
      </button>
    </motion.div>
  );
}

/* ── Validate each step ──────────────────────────────────────── */
function isStepValid(step: number, form: FormData) {
  if (step === 0) return form.name.trim() !== '' && form.address.trim() !== '' && form.description.trim() !== '' && form.categories.length > 0;
  return true;
}

/* ── Main Modal ──────────────────────────────────────────────── */
export function AddVenueModal({ onClose }: { onClose: () => void }) {
  const [step, setStep]       = useState(0);
  const [form, setFormState]  = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(partial: Partial<FormData>) {
    setFormState(prev => ({ ...prev, ...partial }));
  }

  function handleSubmit() {
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 1200);
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
            {!submitted && <p className="text-xs text-gray-400 mt-0.5">Gửi yêu cầu đến admin để duyệt</p>}
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
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
                Gửi yêu cầu duyệt
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
        )}
      </motion.div>
    </div>
  );
}
