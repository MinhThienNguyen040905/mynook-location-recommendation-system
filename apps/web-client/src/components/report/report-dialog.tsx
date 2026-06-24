'use client';

import { useMemo, useState, type ReactElement } from 'react';
import axios from 'axios';
import { AlertTriangle, Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { reportReview, reportVenue } from '@/lib/api/reports';
import { useAuthStore } from '@/stores/auth-store';

type ReportTarget = 'venue' | 'review';

interface ReportReason {
  value: string;
  label: string;
}

const REVIEW_REASONS: ReportReason[] = [
  { value: 'spam', label: 'Spam / quảng cáo' },
  { value: 'offensive', label: 'Ngôn từ xúc phạm' },
  { value: 'fake', label: 'Review giả mạo' },
  { value: 'irrelevant', label: 'Không liên quan địa điểm' },
  { value: 'other', label: 'Lý do khác' },
];

const VENUE_REASONS: ReportReason[] = [
  { value: 'fake', label: 'Địa điểm giả mạo' },
  { value: 'wrong_info', label: 'Thông tin sai' },
  { value: 'closed', label: 'Đã đóng cửa' },
  { value: 'duplicate', label: 'Trùng địa điểm khác' },
  { value: 'offensive', label: 'Nội dung vi phạm' },
  { value: 'other', label: 'Lý do khác' },
];

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown; error?: unknown } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (error.response?.status === 401) return 'Bạn cần đăng nhập để gửi báo cáo.';
    if (error.response?.status === 400) return 'Báo cáo không hợp lệ hoặc đã được gửi trước đó.';
  }
  return 'Không gửi được báo cáo. Vui lòng thử lại.';
}

export function ReportDialog({
  target,
  targetId,
  trigger,
}: {
  target: ReportTarget;
  targetId: string;
  trigger: ReactElement;
}) {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasons = target === 'venue' ? VENUE_REASONS : REVIEW_REASONS;
  const title = target === 'venue' ? 'Báo cáo địa điểm' : 'Báo cáo review';
  const descriptionText =
    target === 'venue'
      ? 'Báo cáo sẽ được gửi đến admin để kiểm tra thông tin địa điểm.'
      : 'Báo cáo sẽ được gửi đến admin để kiểm tra nội dung review.';
  const selectedReasonLabel = useMemo(
    () => reasons.find((item) => item.value === reason)?.label ?? '',
    [reason, reasons],
  );

  async function handleSubmit() {
    setError(null);
    if (!user) {
      setError('Bạn cần đăng nhập để gửi báo cáo.');
      return;
    }
    if (!reason) {
      setError('Vui lòng chọn lý do báo cáo.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reason,
        description: description.trim() || undefined,
      };
      if (target === 'venue') {
        await reportVenue({ venue_id: targetId, ...payload });
      } else {
        await reportReview({ review_id: targetId, ...payload });
      }
      toast.success('Đã gửi báo cáo. Admin sẽ kiểm tra sớm.');
      setOpen(false);
      setReason('');
      setDescription('');
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="size-5 text-red-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!user && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>Bạn cần đăng nhập trước khi gửi báo cáo.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lý do
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn lý do báo cáo" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mô tả thêm
            </label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              placeholder={
                selectedReasonLabel
                  ? `Mô tả thêm về: ${selectedReasonLabel.toLowerCase()}`
                  : 'Nêu thêm chi tiết để admin dễ kiểm tra...'
              }
              rows={4}
            />
            <p className="text-xs text-slate-400">{description.length}/2000</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason || !user}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
            Gửi báo cáo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
