'use client';

import { useState, useRef } from 'react';
import { X, Star, ImagePlus, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { createReview } from '@/lib/api/reviews';
import { uploadMedia } from '@/lib/api/upload';

interface WriteReviewModalProps {
  venueId: string;
  venueName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WriteReviewModal({ venueId, venueName, onClose, onSuccess }: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STAR_LABELS = ['', 'Tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Xuất sắc'];
  const MIN_CHARS = 20;
  const MAX_FILES = 5;
  const canSubmit = rating > 0 && text.trim().length >= MIN_CHARS && !isUploading;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const remaining = MAX_FILES - files.length;
    const toAdd = selected.slice(0, remaining);

    setFiles((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError('');
    try {
      // Upload files to Cloudinary first
      let mediaUrls: string[] = [];
      if (files.length > 0) {
        setIsUploading(true);
        const results = await uploadMedia(files);
        mediaUrls = results.map((r) => r.url);
        setIsUploading(false);
      }

      await createReview({
        venue_id: venueId,
        rating,
        content: text.trim(),
        media: mediaUrls.length > 0 ? mediaUrls : undefined,
      });
      setDone(true);
      onSuccess?.();
    } catch {
      setError('Không thể gửi bình luận. Vui lòng đăng nhập và thử lại.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
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
        className="relative z-10 w-full sm:max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Write a Review</h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate max-w-[240px]">{venueName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500"
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
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-5">
                <CheckCircle2 size={44} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Thank you!</h3>
              <p className="text-slate-500 mb-8">
                Your review has been submitted successfully.
              </p>
              <button
                onClick={onClose}
                className="bg-[#e9590c] hover:bg-[#c2410b] text-white font-bold py-3 px-10 rounded-xl transition-colors"
              >
                Close
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
                              : 'text-slate-200 dark:text-slate-600 fill-slate-200 dark:fill-slate-600'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold transition-opacity',
                      (hovered || rating) > 0
                        ? 'text-slate-700 dark:text-slate-300 opacity-100'
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
                    placeholder="Share your experience... (at least 20 characters)"
                    rows={4}
                    className="block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] text-sm outline-none resize-none leading-relaxed"
                  />
                  <div className="flex justify-end mt-1.5">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        text.length < MIN_CHARS ? 'text-slate-400' : 'text-green-500'
                      )}
                    >
                      {text.length}/{MIN_CHARS} min characters
                    </span>
                  </div>
                </div>

                {/* Media Upload */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Photos / Videos (optional, max {MAX_FILES})
                  </label>

                  {/* Previews */}
                  {previews.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {previews.map((src, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                          {files[i]?.type.startsWith('video/') ? (
                            <video src={src} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* File picker button */}
                  {files.length < MAX_FILES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 hover:border-[#e9590c] hover:text-[#e9590c] transition-colors w-full justify-center"
                    >
                      <ImagePlus size={18} />
                      Choose files
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6">
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="w-full bg-[#e9590c] hover:bg-[#c2410b] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#e9590c]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>{isUploading ? 'Uploading media...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    'Submit Review'
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
