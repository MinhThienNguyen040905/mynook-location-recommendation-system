'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { NookLogo } from '@/components/shared/nook-logo';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { forgotPassword, resetPassword } from '@/lib/api/auth';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormData,
  type ResetPasswordFormData,
} from '@/lib/validators/auth';
import { cn } from '@/lib/utils';

type Step = 'email' | 'reset' | 'done';

const SLIDE = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -30 },
  transition: { duration: 0.3 },
};

/* ── Step 1: Enter email ─────────────────────────────────────── */
function EmailStep({ onNext }: { onNext: (email: string, token: string) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    try {
      const res = await forgotPassword({ email: data.email });
      if (res.dev_reset_token) {
        // Dev mode: token trả về trong response
        onNext(data.email, res.dev_reset_token);
      } else {
        // Production: chỉ hiện thông báo kiểm tra email
        toast.success('Vui lòng kiểm tra email để nhận link đặt lại mật khẩu.');
        onNext(data.email, '');
      }
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Đã có lỗi xảy ra');
      } else {
        toast.error('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    }
  }

  return (
    <motion.div key="email" {...SLIDE}>
      <div className="mb-8">
        <div className="w-14 h-14 bg-nook-olive/10 rounded-2xl flex items-center justify-center mb-6">
          <Mail className="text-nook-olive" size={28} />
        </div>
        <h1 className="text-4xl font-serif font-bold text-nook-ink mb-3">Quên mật khẩu?</h1>
        <p className="text-nook-ink/60 leading-relaxed">
          Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu đến hộp thư của bạn.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-nook-ink/30" size={20} />
            <input
              type="email"
              placeholder="Email của bạn"
              {...register('email')}
              className={cn(
                'nook-input !pl-12',
                errors.email && 'border-red-400 ring-2 ring-red-100',
              )}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="nook-button-primary w-full py-4 text-lg flex items-center justify-center gap-2 group disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <span>Gửi yêu cầu</span>
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-nook-ink/60">
        Nhớ mật khẩu rồi?{' '}
        <Link href="/login" className="text-nook-olive font-bold hover:underline">
          Đăng nhập
        </Link>
      </p>
    </motion.div>
  );
}

/* ── Step 2: New password ────────────────────────────────────── */
function ResetStep({
  token,
  onNext,
  onBack,
}: {
  token: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('new_password', '');

  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /\d/.test(password) ? 4
    : 3;

  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];

  async function onSubmit(data: ResetPasswordFormData) {
    if (!token) {
      toast.error('Không tìm thấy reset token. Vui lòng thử lại từ đầu.');
      onBack();
      return;
    }

    try {
      await resetPassword({ token, new_password: data.new_password });
      toast.success('Đặt lại mật khẩu thành công!');
      onNext();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        toast.error('Token không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
        onBack();
      } else {
        toast.error('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    }
  }

  return (
    <motion.div key="reset" {...SLIDE}>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-nook-ink/50 hover:text-nook-olive mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="mb-8">
        <div className="w-14 h-14 bg-nook-olive/10 rounded-2xl flex items-center justify-center mb-6">
          <Lock className="text-nook-olive" size={28} />
        </div>
        <h1 className="text-4xl font-serif font-bold text-nook-ink mb-3">Mật khẩu mới</h1>
        <p className="text-nook-ink/60">Đặt mật khẩu mới cho tài khoản của bạn.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-nook-ink/30" size={20} />
            <input
              type="password"
              placeholder="Mật khẩu mới"
              {...register('new_password')}
              className={cn(
                'nook-input !pl-12',
                errors.new_password && 'border-red-400 ring-2 ring-red-100',
              )}
            />
          </div>
          {errors.new_password && (
            <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.new_password.message}</p>
          )}
          {/* Strength bar */}
          {password.length > 0 && (
            <div className="mt-2 flex gap-1.5 items-center">
              {[1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    strength >= level ? strengthColor[strength] : 'bg-nook-sand'
                  }`}
                />
              ))}
              <span className={`text-xs font-medium ml-1 ${
                strength <= 1 ? 'text-red-500'
                : strength === 2 ? 'text-yellow-600'
                : strength === 3 ? 'text-blue-500'
                : 'text-green-600'
              }`}>
                {strengthLabel[strength]}
              </span>
            </div>
          )}
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-nook-ink/30" size={20} />
            <input
              type="password"
              placeholder="Xác nhận mật khẩu"
              {...register('confirm_password')}
              className={cn(
                'nook-input !pl-12',
                errors.confirm_password && 'border-red-400 ring-2 ring-red-100',
              )}
            />
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="nook-button-primary w-full py-4 text-lg flex items-center justify-center gap-2 group disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <span>Xác nhận đổi mật khẩu</span>
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}

/* ── Step 3: Success ─────────────────────────────────────────── */
function DoneStep() {
  return (
    <motion.div key="done" {...SLIDE} className="text-center">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
          <CheckCircle className="text-green-500" size={40} />
        </div>
      </div>
      <h1 className="text-4xl font-serif font-bold text-nook-ink mb-3">Hoàn tất!</h1>
      <p className="text-nook-ink/60 mb-10 leading-relaxed">
        Mật khẩu của bạn đã được cập nhật thành công.
        <br />Hãy đăng nhập lại để tiếp tục.
      </p>
      <Link
        href="/login"
        className="nook-button-primary inline-flex items-center justify-center gap-2 py-4 px-10 text-lg group"
      >
        <span>Đăng nhập ngay</span>
        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.div>
  );
}

/* ── Step indicator ──────────────────────────────────────────── */
function StepDots({ current }: { current: number }) {
  return (
    <div className="flex gap-2 mb-10">
      {[0, 1].map(i => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current ? 'w-8 bg-nook-olive' : i < current ? 'w-4 bg-nook-olive/40' : 'w-4 bg-nook-sand'
          }`}
        />
      ))}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [resetToken, setResetToken] = useState('');

  const stepIndex = { email: 0, reset: 1, done: 2 }[step];

  return (
    <div className="min-h-screen flex items-stretch bg-nook-cream">
      {/* Left Side: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <Link href="/" className="mb-12 inline-block">
            <NookLogo size="md" iconClassName="rotate-180" />
          </Link>

          {/* Step dots — hide on done */}
          {step !== 'done' && <StepDots current={stepIndex} />}

          <AnimatePresence mode="wait">
            {step === 'email' && (
              <EmailStep
                onNext={(_email, token) => {
                  setResetToken(token);
                  if (token) {
                    // Dev mode: có token → chuyển thẳng sang đặt mật khẩu mới
                    setStep('reset');
                  } else {
                    // Production: hiện thông báo kiểm tra email
                    setStep('done');
                  }
                }}
              />
            )}
            {step === 'reset' && (
              <ResetStep
                token={resetToken}
                onNext={() => setStep('done')}
                onBack={() => setStep('email')}
              />
            )}
            {step === 'done' && <DoneStep />}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Side: Visual */}
      <div className="hidden lg:flex flex-1 relative bg-nook-olive overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000"
            alt="Background"
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nook-olive via-nook-olive/50 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-end p-24 text-white">
          <div className="w-16 h-1 bg-white mb-12 rounded-full" />
          <h2 className="text-5xl font-serif font-bold mb-8 leading-tight">
            &ldquo;Bảo mật tốt là nền tảng của sự tin tưởng.&rdquo;
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full border border-white/30" />
            <div>
              <p className="font-bold">MyNook Security</p>
              <p className="text-white/60 text-sm italic">Bảo vệ tài khoản của bạn</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
