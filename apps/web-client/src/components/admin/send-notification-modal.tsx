'use client';

import { useState } from 'react';
import { X, Bell, Users, Store, Send, CheckCircle2, Loader2, AlertCircle, Info, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { broadcastNotification, type BroadcastPayload } from '@/lib/api/admin';

interface SendNotificationModalProps {
  onClose: () => void;
}

type Target = 'all' | 'customer' | 'owner';
type NotifType = 'system' | 'promo' | 'reminder' | 'review_reply';

const TARGET_OPTIONS: { key: Target; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'all',      label: 'Tất cả',      desc: 'Gửi đến toàn bộ người dùng',   icon: <Bell size={16} />  },
  { key: 'customer', label: 'Customer',    desc: 'Chỉ tài khoản khách hàng',      icon: <Users size={16} /> },
  { key: 'owner',    label: 'Owner',       desc: 'Chỉ tài khoản chủ quán',        icon: <Store size={16} /> },
];

const TYPE_OPTIONS: { key: NotifType; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'system',       label: 'Hệ thống', color: 'border-blue-300 bg-blue-50 text-blue-700',     icon: <Info size={15} /> },
  { key: 'promo',        label: 'Ưu đãi',   color: 'border-purple-300 bg-purple-50 text-purple-700', icon: <Gift size={15} /> },
  { key: 'reminder',     label: 'Nhắc nhở', color: 'border-amber-300 bg-amber-50 text-amber-700',  icon: <AlertCircle size={15} /> },
  { key: 'review_reply', label: 'Phản hồi', color: 'border-green-300 bg-green-50 text-green-700',  icon: <CheckCircle2 size={15} /> },
];

const TYPE_HEADER_COLOR: Record<NotifType, string> = {
  system: 'bg-blue-500',
  promo: 'bg-purple-500',
  reminder: 'bg-amber-500',
  review_reply: 'bg-green-500',
};

export function SendNotificationModal({ onClose }: SendNotificationModalProps) {
  const [target, setTarget] = useState<Target>('all');
  const [type, setType] = useState<NotifType>('system');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [step, setStep] = useState<'form' | 'preview' | 'sending' | 'done'>('form');
  const [sentCount, setSentCount] = useState(0);

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: BroadcastPayload) => broadcastNotification(payload),
    onMutate: () => setStep('sending'),
    onSuccess: (res) => {
      setSentCount(res.inserted ?? res.total ?? 0);
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      setStep('done');
    },
    onError: () => {
      toast.error('Gửi thông báo thất bại. Vui lòng thử lại.');
      setStep('preview');
    },
  });

  const canNext = title.trim().length > 0 && body.trim().length >= 10;

  function handleSend() {
    mutation.mutate({
      target,
      title: title.trim(),
      message: body.trim(),
      type,
    });
  }

  const selectedType = TYPE_OPTIONS.find((t) => t.key === type)!;
  const selectedTarget = TARGET_OPTIONS.find((t) => t.key === target)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !mutation.isPending && onClose()}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-nook-olive/10 text-nook-olive flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Gửi thông báo</h2>
              <p className="text-xs text-slate-400">
                {step === 'preview' ? 'Xem lại trước khi gửi' : 'Soạn và gửi đến người dùng'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 py-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Đối tượng nhận
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TARGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setTarget(opt.key)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-bold transition-all',
                        target === opt.key
                          ? 'border-nook-olive bg-nook-olive/5 text-nook-olive'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300',
                      )}
                    >
                      {opt.icon}
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">{selectedTarget.desc}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Loại thông báo
                </label>
                <div className="flex gap-2 flex-wrap">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setType(opt.key)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all',
                        type === opt.key ? opt.color + ' border-current' : 'border-slate-200 text-slate-500 hover:border-slate-300',
                      )}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Tiêu đề <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Cập nhật chính sách sử dụng..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-nook-olive bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Nội dung <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Nhập nội dung thông báo... (ít nhất 10 ký tự)"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-nook-olive"
                />
                <div className="flex justify-end mt-1">
                  <span className={cn('text-xs font-medium', body.length < 10 ? 'text-slate-300' : 'text-green-500')}>
                    {body.length} ký tự
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Huỷ
                </button>
                <button
                  onClick={() => setStep('preview')}
                  disabled={!canNext}
                  className="flex-1 py-3 rounded-xl bg-nook-olive text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-nook-olive/90 transition-colors"
                >
                  Xem trước →
                </button>
              </div>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 py-5 space-y-5">
              <p className="text-sm text-slate-500">Xem lại thông báo trước khi gửi:</p>

              <div className={cn('rounded-2xl border-2 p-5', selectedType.color)}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{selectedType.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm mb-1">{title}</h4>
                    <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{body}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Đối tượng</p>
                  <p className="text-sm font-bold text-slate-700">{selectedTarget.label}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Loại</p>
                  <p className="text-sm font-bold text-slate-700">{selectedType.label}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('form')} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  ← Chỉnh sửa
                </button>
                <button
                  onClick={handleSend}
                  className="flex-1 py-3 rounded-xl bg-nook-olive text-white text-sm font-bold hover:bg-nook-olive/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Send size={15} /> Gửi thông báo
                </button>
              </div>
            </motion.div>
          )}

          {step === 'sending' && (
            <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-nook-olive/10 text-nook-olive flex items-center justify-center mb-5">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Đang gửi...</h3>
              <p className="text-sm text-slate-400">Thông báo đang được gửi đến {selectedTarget.label.toLowerCase()}</p>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="px-6 py-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-5">
                <CheckCircle2 size={44} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-slate-800 mb-2">Đã gửi!</h3>
              <p className="text-slate-500 mb-6">
                Thông báo đã được gửi thành công đến{' '}
                <span className="font-bold text-nook-olive">{sentCount.toLocaleString('vi-VN')} tài khoản</span>.
              </p>
              <button onClick={onClose} className="px-10 py-3 rounded-xl bg-nook-olive text-white font-bold hover:bg-nook-olive/90 transition-colors">
                Đóng
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
