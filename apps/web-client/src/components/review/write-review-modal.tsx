'use client';

import { useState } from 'react';
import { X, Star, ImagePlus, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface WriteReviewModalProps {
  venueName: string;
  onClose: () => void;
}

export function WriteReviewModal({ venueName, onClose }: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const STAR_LABELS = ['', 'Tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Xuất sắc'];
  const MIN_CHARS = 20;
  const canSubmit = rating > 0 && text.trim().length >= MIN_CHARS;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200)); // mock delay
    setIsSubmitting(false);
    setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-nook-sand rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nook-sand">
          <div>
            <h2 className="text-xl font-serif font-bold text-nook-ink">Viết bình luận</h2>
            <p className="text-sm text-nook-ink/50 mt-0.5 truncate max-w-[240px]">{venueName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-nook-sand transition-colors text-nook-ink/50"
          >
            <X size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            /* ── Success State ── */
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 py-12 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-5">
                <CheckCircle2 size={44} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-nook-ink mb-2">Cảm ơn bạn!</h3>
              <p className="text-nook-ink/60 mb-8">
                Bình luận của bạn đã được gửi và đang chờ kiểm duyệt.
              </p>
              <button onClick={onClose} className="nook-button-primary px-10">
                Đóng
              </button>
            </motion.div>
          ) : (
            /* ── Form ── */
            <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="px-6 py-6 space-y-6">
                {/* Star Rating */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          size={36}
                          className={cn(
                            'transition-colors',
                            star <= (hovered || rating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-nook-sand fill-nook-sand'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold transition-opacity',
                      (hovered || rating) > 0
                        ? 'text-nook-olive opacity-100'
                        : 'opacity-0'
                    )}
                  >
                    {STAR_LABELS[hovered || rating]}
                  </span>
                </div>

                {/* Text Area */}
                <div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm của bạn tại đây... (ít nhất 20 ký tự)"
                    rows={4}
                    className="nook-input resize-none leading-relaxed"
                  />
                  <div className="flex justify-end mt-1.5">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        text.length < MIN_CHARS ? 'text-nook-ink/30' : 'text-green-500'
                      )}
                    >
                      {text.length}/{MIN_CHARS} ký tự tối thiểu
                    </span>
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="text-xs font-bold text-nook-ink/40 uppercase tracking-widest block mb-2">
                    Ảnh (tuỳ chọn)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ImagePlus
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-nook-ink/30"
                      />
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Dán URL ảnh vào đây..."
                        className="nook-input pl-9 text-sm"
                      />
                    </div>
                    {imageUrl && (
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-nook-sand shrink-0">
                        <img
                          src={imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6">
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="nook-button-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    'Gửi bình luận'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
