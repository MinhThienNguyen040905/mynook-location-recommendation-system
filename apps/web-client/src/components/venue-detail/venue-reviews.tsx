'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  ImagePlus,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Reply,
  Send,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { createReviewComment, getVenueReviews, setReviewReaction } from '@/lib/api/reviews';
import { uploadMedia } from '@/lib/api/upload';
import { ReportDialog } from '@/components/report/report-dialog';
import { WriteReviewModal } from '@/components/review/write-review-modal';
import { useAuthStore } from '@/stores/auth-store';
import type { Review, ReviewAiAnalysis, ReviewComment, ReviewReaction } from '@/types/review';

interface VenueReviewsProps {
  venueId: string;
  venueName: string;
  initialReviews: Review[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; icon: typeof ThumbsUp }> = {
  positive: { label: 'Tích cực', color: 'text-green-600 bg-green-50 border-green-200', icon: ThumbsUp },
  negative: { label: 'Tiêu cực', color: 'text-red-600 bg-red-50 border-red-200', icon: ThumbsDown },
  neutral: { label: 'Trung lập', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: Sparkles },
  mixed: { label: 'Hỗn hợp', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Sparkles },
};

const TIME_LABELS: Record<string, string> = {
  morning: 'Buổi sáng',
  afternoon: 'Buổi chiều',
  evening: 'Buổi tối',
  all_day: 'Cả ngày',
};

/** Format tag key: "good_coffee" → "Good Coffee" */
function formatTag(key: string): string {
  return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function isVideoUrl(url: string): boolean {
  return /\/video\/upload\//.test(url) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function normalizeMediaInput(media: unknown): string[] {
  if (Array.isArray(media)) {
    return media.filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
  }

  if (typeof media === 'string') {
    try {
      return normalizeMediaInput(JSON.parse(media));
    } catch {
      const trimmed = media.trim();
      return trimmed ? [trimmed] : [];
    }
  }

  return [];
}

function MediaStrip({ media }: { media: unknown }) {
  const safeMedia = normalizeMediaInput(media);
  if (safeMedia.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {safeMedia.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
        >
          {isVideoUrl(url) ? (
            <video src={url} className="h-full w-full object-cover" controls />
          ) : (
            <img src={url} alt={`Comment media ${index + 1}`} className="h-full w-full object-cover" />
          )}
        </div>
      ))}
    </div>
  );
}

function SelectedMediaPreview({
  previews,
  files,
  onRemove,
}: {
  previews: string[];
  files: File[];
  onRemove: (index: number) => void;
}) {
  if (previews.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {previews.map((src, index) => (
        <div
          key={`${src}-${index}`}
          className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
        >
          {files[index]?.type.startsWith('video/') ? (
            <video src={src} className="h-full w-full object-cover" muted />
          ) : (
            <img src={src} alt={`Selected media ${index + 1}`} className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity hover:opacity-100"
            aria-label="Remove selected media"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function AiAnalysisBadge({ analysis }: { analysis: ReviewAiAnalysis }) {
  const sentiment = SENTIMENT_CONFIG[analysis.sentiment] ?? SENTIMENT_CONFIG.neutral;
  const SentimentIcon = sentiment.icon;

  return (
    <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={12} className="text-[#e9590c]" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          AI Phân tích
        </span>
      </div>

      {/* Sentiment + Summary */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sentiment.color}`}>
          <SentimentIcon size={10} />
          {sentiment.label}
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400 italic flex-1">
          {analysis.summary}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {analysis.positive_tags.map((tag) => (
          <span
            key={`pos-${tag}`}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
          >
            <ThumbsUp size={9} />
            {formatTag(tag)}
          </span>
        ))}
        {analysis.negative_tags.map((tag) => (
          <span
            key={`neg-${tag}`}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
          >
            <ThumbsDown size={9} />
            {formatTag(tag)}
          </span>
        ))}
      </div>

      {/* Time context */}
      {analysis.time_context && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
          <Clock size={10} />
          {TIME_LABELS[analysis.time_context] ?? analysis.time_context}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  depth = 0,
  activeReplyId,
  replyDraft,
  replyFiles,
  replyPreviews,
  isSubmitting,
  isUploading,
  onReplyStart,
  onReplyDraftChange,
  onReplyFileSelect,
  onReplyMediaRemove,
  onReplySubmit,
}: {
  comment: ReviewComment;
  depth?: number;
  activeReplyId: string | null;
  replyDraft: string;
  replyFiles: File[];
  replyPreviews: string[];
  isSubmitting: boolean;
  isUploading: boolean;
  onReplyStart: (commentId: string) => void;
  onReplyDraftChange: (value: string) => void;
  onReplyFileSelect: (files: FileList | null) => void;
  onReplyMediaRemove: (index: number) => void;
  onReplySubmit: (parentCommentId: string) => void;
}) {
  const authorName = comment.author?.display_name || 'Người dùng';
  const initial = authorName.charAt(0).toUpperCase();
  const showReplyForm = activeReplyId === comment.id;

  return (
    <div className={depth > 0 ? 'ml-8 mt-3' : 'mt-3'}>
      <div className="flex gap-2">
        {comment.author?.avatar_url ? (
          <img
            src={comment.author.avatar_url}
            alt={authorName}
            className="size-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
          />
        ) : (
          <div className="size-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold flex items-center justify-center text-xs shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-700/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {authorName}
              </span>
              <span className="text-[11px] text-slate-400 shrink-0" suppressHydrationWarning>
                {timeAgo(comment.created_at)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {comment.content}
            </p>
            <MediaStrip media={comment.media ?? []} />
          </div>
          <button
            type="button"
            onClick={() => onReplyStart(comment.id)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#e9590c]"
          >
            <Reply size={12} />
            Trả lời
          </button>
          {showReplyForm && (
            <div className="mt-2">
              <div className="flex gap-2">
                <input
                  value={replyDraft}
                  onChange={(event) => onReplyDraftChange(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#e9590c]"
                  placeholder="Viết phản hồi..."
                />
                <label className="size-9 rounded-lg border border-slate-200 text-slate-500 hover:border-[#e9590c]/40 hover:text-[#e9590c] dark:border-slate-700 flex items-center justify-center cursor-pointer">
                  <ImagePlus size={15} />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(event) => {
                      onReplyFileSelect(event.target.files);
                      event.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  disabled={isSubmitting || isUploading || replyDraft.trim().length === 0}
                  onClick={() => onReplySubmit(comment.id)}
                  className="size-9 rounded-lg bg-[#e9590c] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:bg-[#c2410b]"
                  aria-label="Send reply"
                >
                  {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
              <SelectedMediaPreview
                files={replyFiles}
                previews={replyPreviews}
                onRemove={onReplyMediaRemove}
              />
            </div>
          )}

          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              activeReplyId={activeReplyId}
              replyDraft={replyDraft}
              replyFiles={replyFiles}
              replyPreviews={replyPreviews}
              isSubmitting={isSubmitting}
              isUploading={isUploading}
              onReplyStart={onReplyStart}
              onReplyDraftChange={onReplyDraftChange}
              onReplyFileSelect={onReplyFileSelect}
              onReplyMediaRemove={onReplyMediaRemove}
              onReplySubmit={onReplySubmit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  isOwnReview,
  isTargetReview,
  onReactionUpdated,
  onCommentCreated,
}: {
  review: Review;
  isOwnReview: boolean;
  isTargetReview: boolean;
  onReactionUpdated: (reviewId: string, summary: { like_count: number; dislike_count: number; my_reaction: ReviewReaction | null }) => void;
  onCommentCreated: (reviewId: string, comment: ReviewComment) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [commentPreviews, setCommentPreviews] = useState<string[]>([]);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyPreviews, setReplyPreviews] = useState<string[]>([]);
  const [isReacting, setIsReacting] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUploadingCommentMedia, setIsUploadingCommentMedia] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const commentPreviewsRef = useRef<string[]>([]);
  const replyPreviewsRef = useRef<string[]>([]);
  const isLong = (review.content?.length ?? 0) > 150;
  const authorName = review.author?.display_name || 'Người dùng ẩn danh';
  const initial = authorName.charAt(0).toUpperCase();
  const reviewMedia = normalizeMediaInput(review.media);
  const activePhoto = activePhotoIndex === null ? null : reviewMedia[activePhotoIndex];
  const comments = review.comments ?? [];
  const maxCommentFiles = 4;

  const addSelectedFiles = (
    selectedFiles: FileList | null,
    currentFiles: File[],
    setFiles: (files: File[]) => void,
    setPreviews: (previews: string[]) => void,
    currentPreviews: string[],
  ) => {
    const selected = Array.from(selectedFiles ?? []);
    if (selected.length === 0) return;
    const remaining = maxCommentFiles - currentFiles.length;
    const nextFiles = selected.slice(0, remaining);
    setFiles([...currentFiles, ...nextFiles]);
    setPreviews([...currentPreviews, ...nextFiles.map((file) => URL.createObjectURL(file))]);
  };

  const removeSelectedFile = (
    index: number,
    files: File[],
    previews: string[],
    setFiles: (files: File[]) => void,
    setPreviews: (previews: string[]) => void,
  ) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(files.filter((_, fileIndex) => fileIndex !== index));
    setPreviews(previews.filter((_, previewIndex) => previewIndex !== index));
  };

  const handleReaction = async (reaction: ReviewReaction) => {
    if (isReacting) return;
    const nextReaction = review.my_reaction === reaction ? null : reaction;
    setIsReacting(true);
    setActionError(null);
    try {
      const summary = await setReviewReaction(review.id, nextReaction);
      onReactionUpdated(review.id, summary);
    } catch (error) {
      console.error('Failed to update review reaction:', error);
      setActionError('Không thể cập nhật cảm xúc. Vui lòng đăng nhập và thử lại.');
    } finally {
      setIsReacting(false);
    }
  };

  const submitComment = async (parentCommentId?: string | null) => {
    const content = parentCommentId ? replyDraft.trim() : commentDraft.trim();
    if (!content || isSubmittingComment) return;
    const filesToUpload = parentCommentId ? replyFiles : commentFiles;

    setIsSubmittingComment(true);
    setIsUploadingCommentMedia(filesToUpload.length > 0);
    setActionError(null);
    try {
      const uploadResults =
        filesToUpload.length > 0 ? await uploadMedia(filesToUpload) : [];
      const media = uploadResults.map((result) => result.url);
      const comment = await createReviewComment(review.id, {
        content,
        parent_comment_id: parentCommentId ?? null,
        media,
      });
      onCommentCreated(review.id, comment);
      if (parentCommentId) {
        replyPreviews.forEach((preview) => URL.revokeObjectURL(preview));
        setReplyDraft('');
        setReplyFiles([]);
        setReplyPreviews([]);
        setActiveReplyId(null);
      } else {
        commentPreviews.forEach((preview) => URL.revokeObjectURL(preview));
        setCommentDraft('');
        setCommentFiles([]);
        setCommentPreviews([]);
        setCommentOpen(true);
        if (commentFileInputRef.current) commentFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to create review comment:', error);
      setActionError('Không thể gửi bình luận. Vui lòng đăng nhập và thử lại.');
    } finally {
      setIsSubmittingComment(false);
      setIsUploadingCommentMedia(false);
    }
  };

  const closePhoto = () => setActivePhotoIndex(null);
  const showPreviousPhoto = () => {
    setActivePhotoIndex((current) => {
      if (current === null) return current;
      return current === 0 ? reviewMedia.length - 1 : current - 1;
    });
  };
  const showNextPhoto = () => {
    setActivePhotoIndex((current) => {
      if (current === null) return current;
      return current === reviewMedia.length - 1 ? 0 : current + 1;
    });
  };

  useEffect(() => {
    if (activePhotoIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePhoto();
      if (event.key === 'ArrowLeft') showPreviousPhoto();
      if (event.key === 'ArrowRight') showNextPhoto();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activePhotoIndex, reviewMedia.length]);

  useEffect(() => {
    commentPreviewsRef.current = commentPreviews;
    replyPreviewsRef.current = replyPreviews;
  }, [commentPreviews, replyPreviews]);

  useEffect(() => {
    return () => {
      commentPreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview));
      replyPreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, []);

  return (
    <div
      id={`review-${review.id}`}
      className={`scroll-mt-24 py-5 border-b border-slate-100 dark:border-slate-700 last:border-0 ${
        isTargetReview
          ? 'rounded-xl bg-amber-50 px-4 -mx-1 ring-2 ring-amber-300 dark:bg-amber-950/20 dark:ring-amber-800'
          : isOwnReview
            ? 'rounded-xl bg-orange-50/50 px-4 -mx-1 dark:bg-orange-950/10'
            : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {review.author?.avatar_url ? (
            <img
              src={review.author.avatar_url}
              alt={authorName}
              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold flex items-center justify-center text-sm shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {authorName}
              </span>
              {review.is_verified_visit && (
                <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <BadgeCheck size={12} />
                  Đã ghé thăm
                </span>
              )}
              {isOwnReview && (
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300">
                  Review của bạn
                </span>
              )}
              {isTargetReview && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  Review từ thông báo
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    className={s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600 fill-slate-200 dark:fill-slate-600'}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400" suppressHydrationWarning>
                {timeAgo(review.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {review.content && (
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {isLong && !expanded ? `${review.content.slice(0, 150)}...` : review.content}
        </p>
      )}
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-bold text-[#e9590c] mt-1.5 hover:underline"
        >
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}

      {reviewMedia.length > 0 && (
        <div className="flex gap-2 mt-3">
          {reviewMedia.map((url, i) => (
            <button
              type="button"
              key={`${url}-${i}`}
              onClick={() => setActivePhotoIndex(i)}
              className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-[#e9590c]/60 transition-colors"
            >
              <img src={url} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isReacting}
          onClick={() => handleReaction('like')}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
            review.my_reaction === 'like'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/30 dark:text-green-300'
              : 'border-slate-200 text-slate-500 hover:border-green-200 hover:text-green-700 dark:border-slate-700 dark:text-slate-400'
          }`}
        >
          <ThumbsUp size={14} />
          {review.like_count ?? 0}
        </button>
        <button
          type="button"
          disabled={isReacting}
          onClick={() => handleReaction('dislike')}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
            review.my_reaction === 'dislike'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300'
              : 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-700 dark:border-slate-700 dark:text-slate-400'
          }`}
        >
          <ThumbsDown size={14} />
          {review.dislike_count ?? 0}
        </button>
        <button
          type="button"
          onClick={() => setCommentOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-[#e9590c]/40 hover:text-[#e9590c] dark:border-slate-700 dark:text-slate-400"
        >
          <MessageSquare size={14} />
          {review.comment_count ?? 0}
        </button>
        {!isOwnReview && (
          <ReportDialog
            target="review"
            targetId={review.id}
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-red-200 hover:text-red-600 dark:border-slate-700 dark:text-slate-400"
              >
                <Flag size={14} />
                Báo cáo
              </button>
            }
          />
        )}
      </div>

      {actionError && !commentOpen && comments.length === 0 && (
        <p className="mt-2 text-xs text-red-500">{actionError}</p>
      )}

      {(commentOpen || comments.length > 0) && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
          <div className="flex gap-2">
            <input
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              onFocus={() => setCommentOpen(true)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#e9590c] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Viết bình luận..."
            />
            <button
              type="button"
              onClick={() => commentFileInputRef.current?.click()}
              className="size-9 rounded-lg border border-slate-200 text-slate-500 hover:border-[#e9590c]/40 hover:text-[#e9590c] dark:border-slate-700 flex items-center justify-center"
              aria-label="Add comment media"
            >
              <ImagePlus size={15} />
            </button>
            <input
              ref={commentFileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(event) => {
                addSelectedFiles(
                  event.target.files,
                  commentFiles,
                  setCommentFiles,
                  setCommentPreviews,
                  commentPreviews,
                );
                event.target.value = '';
              }}
              className="hidden"
            />
            <button
              type="button"
              disabled={isSubmittingComment || isUploadingCommentMedia || commentDraft.trim().length === 0}
              onClick={() => submitComment(null)}
              className="size-9 rounded-lg bg-[#e9590c] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:bg-[#c2410b]"
              aria-label="Send comment"
            >
              {isUploadingCommentMedia ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <SelectedMediaPreview
            files={commentFiles}
            previews={commentPreviews}
            onRemove={(index) =>
              removeSelectedFile(
                index,
                commentFiles,
                commentPreviews,
                setCommentFiles,
                setCommentPreviews,
              )
            }
          />

          {actionError && (
            <p className="mt-2 text-xs text-red-500">{actionError}</p>
          )}

          {comments.length > 0 && (
            <div className="mt-3">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  activeReplyId={activeReplyId}
                  replyDraft={replyDraft}
                  replyFiles={replyFiles}
                  replyPreviews={replyPreviews}
                  isSubmitting={isSubmittingComment}
                  isUploading={isUploadingCommentMedia}
                  onReplyStart={(commentId) => {
                    setActiveReplyId((current) => (current === commentId ? null : commentId));
                    setReplyDraft('');
                    replyPreviews.forEach((preview) => URL.revokeObjectURL(preview));
                    setReplyFiles([]);
                    setReplyPreviews([]);
                  }}
                  onReplyDraftChange={setReplyDraft}
                  onReplyFileSelect={(files) =>
                    addSelectedFiles(
                      files,
                      replyFiles,
                      setReplyFiles,
                      setReplyPreviews,
                      replyPreviews,
                    )
                  }
                  onReplyMediaRemove={(index) =>
                    removeSelectedFile(
                      index,
                      replyFiles,
                      replyPreviews,
                      setReplyFiles,
                      setReplyPreviews,
                    )
                  }
                  onReplySubmit={submitComment}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activePhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closePhoto}
          role="dialog"
          aria-modal="true"
          aria-label="Review photos"
        >
          <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
            {(activePhotoIndex ?? 0) + 1} / {reviewMedia.length}
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              closePhoto();
            }}
            className="absolute right-4 top-4 size-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
            aria-label="Close review photo"
          >
            <X size={22} />
          </button>

          {reviewMedia.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPreviousPhoto();
                }}
                className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                aria-label="Previous review photo"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNextPhoto();
                }}
                className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                aria-label="Next review photo"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          <img
            src={activePhoto}
            alt={`Review photo ${(activePhotoIndex ?? 0) + 1}`}
            className="max-h-[88vh] max-w-[92vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {/* AI Analysis */}
      {review.ai_analysis_json && (
        <AiAnalysisBadge analysis={review.ai_analysis_json} />
      )}
    </div>
  );
}

function appendComment(comments: ReviewComment[], newComment: ReviewComment): ReviewComment[] {
  if (!newComment.parent_comment_id) {
    return [...comments, newComment];
  }

  return comments.map((comment) => {
    if (comment.id === newComment.parent_comment_id) {
      return {
        ...comment,
        replies: [...(comment.replies ?? []), newComment],
      };
    }

    return {
      ...comment,
      replies: appendComment(comment.replies ?? [], newComment),
    };
  });
}

function RatingDistribution({ reviews }: { reviews: Review[] }) {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => dist[r.rating]++);
  const total = reviews.length;

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((s) => {
        const pct = total > 0 ? Math.round((dist[s] / total) * 100) : 0;
        return (
          <div key={s} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-slate-500 font-medium text-right">{s}</span>
            <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 text-slate-400 text-xs">{dist[s]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function VenueReviews({ venueId, venueName, initialReviews }: VenueReviewsProps) {
  const searchParams = useSearchParams();
  const targetReviewId = searchParams.get('review');
  const user = useAuthStore((state) => state.user);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(initialReviews.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshReviews = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getVenueReviews(venueId);
      setReviews(data);
    } catch (error) {
      console.error('Failed to refresh venue reviews:', error);
      setLoadError('Không tải được danh sách review. Vui lòng thử lại.');
    }
    setIsLoading(false);
  }, [venueId]);

  useEffect(() => {
    refreshReviews();
  }, [refreshReviews]);

  const handleReactionUpdated = useCallback(
    (
      reviewId: string,
      summary: { like_count: number; dislike_count: number; my_reaction: ReviewReaction | null },
    ) => {
      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                like_count: summary.like_count,
                dislike_count: summary.dislike_count,
                my_reaction: summary.my_reaction,
              }
            : review,
        ),
      );
    },
    [],
  );

  const handleCommentCreated = useCallback((reviewId: string, comment: ReviewComment) => {
    setReviews((current) =>
      current.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comment_count: (review.comment_count ?? 0) + 1,
              comments: appendComment(review.comments ?? [], comment),
            }
          : review,
      ),
    );
  }, []);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  // Count reviews with AI analysis
  const aiAnalyzedCount = reviews.filter((r) => r.ai_analysis_json).length;
  const displayedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const aTarget = !!targetReviewId && a.id === targetReviewId;
      const bTarget = !!targetReviewId && b.id === targetReviewId;
      if (aTarget !== bTarget) return aTarget ? -1 : 1;

      if (!user?.id) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      const aOwn = a.account_id === user.id;
      const bOwn = b.account_id === user.id;
      if (aOwn !== bOwn) return aOwn ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reviews, targetReviewId, user?.id]);

  useEffect(() => {
    if (!targetReviewId || isLoading) return;
    const timeout = window.setTimeout(() => {
      document
        .getElementById(`review-${targetReviewId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [targetReviewId, isLoading, displayedReviews]);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Reviews
          {reviews.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-400">({reviews.length})</span>
          )}
        </h3>
        <button
          onClick={() => setShowWriteModal(true)}
          className="flex items-center gap-2 bg-[#e9590c] hover:bg-[#c2410b] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
        >
          <MessageSquarePlus size={16} />
          Viết Review
        </button>
      </div>

      {isLoading && reviews.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
          <div className="mx-auto mb-3 size-8 rounded-full border-2 border-slate-200 border-t-[#e9590c] animate-spin" />
          <p className="text-sm text-slate-400">Đang tải review...</p>
        </div>
      ) : loadError && reviews.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/40 rounded-xl">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-400" />
          <p className="text-slate-500 mb-3">{loadError}</p>
          <button
            onClick={refreshReviews}
            className="text-sm font-bold text-[#e9590c] hover:underline"
          >
            Tải lại
          </button>
        </div>
      ) : reviews.length > 0 ? (
        <>
          {/* Summary */}
          <div className="flex gap-8 items-start mb-6 p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
            <div className="text-center shrink-0">
              <div className="text-5xl font-bold text-slate-900 dark:text-white leading-none">{avgRating}</div>
              <div className="flex justify-center gap-0.5 my-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    className={s <= Math.round(Number(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600 fill-slate-200 dark:fill-slate-600'}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400">{reviews.length} reviews</p>
              {aiAnalyzedCount > 0 && (
                <p className="text-xs text-[#e9590c] mt-1 flex items-center justify-center gap-1">
                  <Sparkles size={10} />
                  {aiAnalyzedCount} AI analyzed
                </p>
              )}
            </div>
            <RatingDistribution reviews={reviews} />
          </div>

          {/* Review list */}
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm px-5">
            {displayedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isOwnReview={!!user?.id && review.account_id === user.id}
                isTargetReview={!!targetReviewId && review.id === targetReviewId}
                onReactionUpdated={handleReactionUpdated}
                onCommentCreated={handleCommentCreated}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="py-12 text-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
          <p className="text-slate-400 mb-2">Chưa có review nào</p>
          <p className="text-sm text-slate-400">Hãy là người đầu tiên chia sẻ trải nghiệm!</p>
        </div>
      )}

      {/* Write Review Modal */}
      <AnimatePresence>
        {showWriteModal && (
          <WriteReviewModal
            venueId={venueId}
            venueName={venueName}
            onClose={() => setShowWriteModal(false)}
            onSuccess={refreshReviews}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
