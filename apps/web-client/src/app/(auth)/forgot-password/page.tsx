'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { NookLogo } from '@/components/shared/nook-logo';
import { motion, AnimatePresence } from 'motion/react';

type Step = 'email' | 'otp' | 'reset' | 'done';

const SLIDE = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -30 },
  transition: { duration: 0.3 },
};

/* ── Step 1: Enter email ─────────────────────────────────────── */
function EmailStep({ onNext }: { onNext: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate API call
    setTimeout(() => { setLoading(false); onNext(email); }, 1000);
  }

  return (
    <motion.div key="email" {...SLIDE}>
      <div className="mb-8">
        <div className="w-14 h-14 bg-nook-olive/10 rounded-2xl flex items-center justify-center mb-6">
          <Mail className="text-nook-olive" size={28} />
        </div>
        <h1 className="text-4xl font-serif font-bold text-nook-ink mb-3">Quên mật khẩu?</h1>
        <p className="text-nook-ink/60 leading-relaxed">
          Nhập email đã đăng ký. Chúng tôi sẽ gửi mã xác nhận 6 số đến hộp thư của bạn.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-nook-ink/30" size={20} />
          <input
            type="email"
            placeholder="Email của bạn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="nook-input pl-12"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="nook-button-primary w-full py-4 text-lg flex items-center justify-center gap-2 group disabled:opacity-60"
        >
          {loading ? (
            <span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Gửi mã xác nhận</span>
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

/* ── Step 2: OTP verification ────────────────────────────────── */
function OtpStep({ email, onNext, onBack }: { email: string; onNext: () => void; onBack: () => void }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const next = [...otp];
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    inputs.current[Math.min(digits.length, 5)]?.focus();
  }

  function handleResend() {
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.join('').length < 6) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onNext(); }, 1000);
  }

  const filled = otp.every(d => d !== '');

  return (
    <motion.div key="otp" {...SLIDE}>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-nook-ink/50 hover:text-nook-olive mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="mb-8">
        <div className="w-14 h-14 bg-nook-olive/10 rounded-2xl flex items-center justify-center mb-6">
          <KeyRound className="text-nook-olive" size={28} />
        </div>
        <h1 className="text-4xl font-serif font-bold text-nook-ink mb-3">Nhập mã OTP</h1>
        <p className="text-nook-ink/60 leading-relaxed">
          Mã 6 số đã được gửi đến{' '}
          <span className="font-bold text-nook-ink">{email}</span>
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* OTP boxes */}
        <div className="flex gap-3 justify-between" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`
                w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none
                transition-all duration-150 bg-white
                ${digit
                  ? 'border-nook-olive text-nook-ink ring-2 ring-nook-olive/20'
                  : 'border-nook-sand text-nook-ink focus:border-nook-olive focus:ring-2 focus:ring-nook-olive/20'
                }
              `}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !filled}
          className="nook-button-primary w-full py-4 text-lg flex items-center justify-center gap-2 group disabled:opacity-60"
        >
          {loading ? (
            <span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Xác nhận</span>
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-nook-ink/60 text-sm">
        Không nhận được mã?{' '}
        <button
          onClick={handleResend}
          className="text-nook-olive font-bold hover:underline"
        >
          {resent ? '✓ Đã gửi lại!' : 'Gửi lại'}
        </button>
      </p>
    </motion.div>
  );
}

/* ── Step 3: New password ────────────────────────────────────── */
function ResetStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);

  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /\d/.test(password) ? 4
    : 3;

  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];

  const mismatch = confirm.length > 0 && password !== confirm;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password !== confirm) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onNext(); }, 1000);
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

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-nook-ink/30" size={20} />
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="nook-input pl-12"
            />
          </div>
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
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className={`nook-input pl-12 ${mismatch ? 'border-red-400 ring-2 ring-red-100' : ''}`}
            />
          </div>
          {mismatch && (
            <p className="text-xs text-red-500 mt-1.5 ml-1">Mật khẩu không khớp</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !password || password !== confirm}
          className="nook-button-primary w-full py-4 text-lg flex items-center justify-center gap-2 group disabled:opacity-60"
        >
          {loading ? (
            <span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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

/* ── Step 4: Success ─────────────────────────────────────────── */
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
      {[0, 1, 2].map(i => (
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
  const [step, setStep]   = useState<Step>('email');
  const [email, setEmail] = useState('');

  const stepIndex = { email: 0, otp: 1, reset: 2, done: 3 }[step];

  return (
    <div className="min-h-screen flex items-stretch bg-nook-cream">
      {/* Left Side: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <Link href="/" className="mb-12 inline-block">
            <NookLogo size="md" />
          </Link>

          {/* Step dots — hide on done */}
          {step !== 'done' && <StepDots current={stepIndex} />}

          <AnimatePresence mode="wait">
            {step === 'email' && (
              <EmailStep
                onNext={(e) => { setEmail(e); setStep('otp'); }}
              />
            )}
            {step === 'otp' && (
              <OtpStep
                email={email}
                onNext={() => setStep('reset')}
                onBack={() => setStep('email')}
              />
            )}
            {step === 'reset' && (
              <ResetStep
                onNext={() => setStep('done')}
                onBack={() => setStep('otp')}
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
