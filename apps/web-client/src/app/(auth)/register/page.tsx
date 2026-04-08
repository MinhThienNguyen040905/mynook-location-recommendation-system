"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User, Eye, EyeOff, MapPin, Coffee, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sendOtp, verifyOtp } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { registerSchema, type RegisterFormData } from "@/lib/validators/auth";
import { ROUTES } from "@/config/routes";
import { isAxiosError } from "axios";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { type: "customer" },
  });

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  /** Step 1: Send OTP */
  async function onSubmit(data: RegisterFormData) {
    try {
      await sendOtp({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        type: data.type,
      });
      setEmail(data.email);
      setStep("otp");
      setCountdown(60);
      toast.success("Mã OTP đã được gửi đến email của bạn!");
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error("Email đã được sử dụng");
      } else {
        toast.error("Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    }
  }

  /** Handle OTP input */
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return; // only digits

    const newValues = [...otpValues];
    newValues[index] = value.slice(-1); // only last digit
    setOtpValues(newValues);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newValues.every((v) => v !== "")) {
      handleVerifyOtp(newValues.join(""));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newValues = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newValues[i] = pasted[i] || "";
    }
    setOtpValues(newValues);

    // Focus last filled or next empty
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    }
  }

  /** Step 2: Verify OTP */
  async function handleVerifyOtp(otp: string) {
    setIsVerifying(true);
    try {
      const res = await verifyOtp({ email, otp });
      setUser(res.user);
      toast.success("Đăng ký thành công!");

      if (res.user.type === "owner") {
        router.push(ROUTES.DASHBOARD);
      } else {
        router.push(ROUTES.HOME);
      }
    } catch (error) {
      setOtpValues(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      if (isAxiosError(error) && error.response?.status === 400) {
        toast.error("Mã OTP không đúng hoặc đã hết hạn");
      } else {
        toast.error("Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setIsVerifying(false);
    }
  }

  /** Resend OTP */
  async function handleResend() {
    if (countdown > 0) return;
    const data = getValues();
    try {
      await sendOtp({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        type: data.type,
      });
      setCountdown(60);
      setOtpValues(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      toast.success("Đã gửi lại mã OTP!");
    } catch {
      toast.error("Không thể gửi lại mã OTP. Vui lòng thử lại.");
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAF9] dark:bg-[#221610] font-sans overflow-hidden">
      {/* Left Side: Authentication Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-10 overflow-y-auto relative">
        <div className="w-full max-w-md space-y-5 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {step === "form" ? (
            <>
              {/* Header */}
              <div className="text-center space-y-1">
                <h1 className="font-serif text-3xl text-[#e9590c] font-bold tracking-tight mb-1">
                  MyNook
                </h1>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Create an account
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Join the community to discover and share the best spots.
                </p>
              </div>

              {/* Social Login */}
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ease-in-out group">
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                    Google
                  </span>
                </button>
                <button className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ease-in-out group">
                  <svg
                    className="h-5 w-5 mr-2 text-[#1877F2]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                    Facebook
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#FAFAF9] dark:bg-[#221610] text-gray-500 uppercase tracking-wide text-xs">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Main Form */}
              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    htmlFor="name"
                  >
                    Full Name
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="text-gray-400" size={20} />
                    </div>
                    <input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      {...registerField("full_name")}
                      className={cn(
                        "block w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-800 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] sm:text-sm transition duration-150",
                        errors.full_name
                          ? "border-red-400 dark:border-red-500"
                          : "border-gray-300 dark:border-gray-600",
                      )}
                    />
                  </div>
                  {errors.full_name && (
                    <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>
                  )}
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    htmlFor="email"
                  >
                    Email address
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="text-gray-400" size={20} />
                    </div>
                    <input
                      id="email"
                      type="email"
                      placeholder="hello@example.com"
                      {...registerField("email")}
                      className={cn(
                        "block w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-800 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] sm:text-sm transition duration-150",
                        errors.email
                          ? "border-red-400 dark:border-red-500"
                          : "border-gray-300 dark:border-gray-600",
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="text-gray-400" size={20} />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...registerField("password")}
                      className={cn(
                        "block w-full pl-10 pr-10 py-2 border rounded-lg bg-white dark:bg-gray-800 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] sm:text-sm transition duration-150",
                        errors.password
                          ? "border-red-400 dark:border-red-500"
                          : "border-gray-300 dark:border-gray-600",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:to-orange-600 hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e9590c] transition-all duration-200 transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#e9590c] hover:text-[#c2410b] transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            /* ── OTP Step ────────────────────────────────── */
            <div className="space-y-8">
              <button
                onClick={() => {
                  setStep("form");
                  setOtpValues(["", "", "", "", "", ""]);
                }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>

              <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <Mail className="text-[#e9590c]" size={28} />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Xác thực email
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Chúng tôi đã gửi mã 6 chữ số đến
                </p>
                <p className="font-medium text-gray-900 dark:text-white">{email}</p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otpValues.map((value, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={isVerifying}
                    className={cn(
                      "w-12 h-14 text-center text-xl font-bold border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] transition-all duration-150",
                      value
                        ? "border-[#e9590c]"
                        : "border-gray-300 dark:border-gray-600",
                      isVerifying && "opacity-60",
                    )}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                onClick={() => {
                  const otp = otpValues.join("");
                  if (otp.length === 6) handleVerifyOtp(otp);
                }}
                disabled={isVerifying || otpValues.some((v) => !v)}
                className="w-full flex justify-center py-3 px-4 rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:to-orange-600 hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e9590c] transition-all duration-200 transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Xác nhận"
                )}
              </button>

              {/* Resend */}
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Không nhận được mã?{" "}
                {countdown > 0 ? (
                  <span className="text-gray-400">
                    Gửi lại sau {countdown}s
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    className="font-semibold text-[#e9590c] hover:text-[#c2410b] transition-colors"
                  >
                    Gửi lại
                  </button>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="absolute bottom-6 text-xs text-gray-400 text-center w-full">
          &copy; 2026 MyNook Inc. All rights reserved.
        </div>
      </div>

      {/* Right Side: Visual Anchor */}
      <div className="hidden lg:block lg:w-1/2 relative h-full">
        <img
          alt="Creative workspace with laptop and coffee"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1200"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

        <div className="absolute inset-0 flex flex-col justify-end p-12 xl:p-24 text-white">
          <div className="max-w-md animate-in fade-in slide-in-from-right-8 duration-700 delay-150 fill-mode-both">
            <div className="flex items-center space-x-3 mb-6">
              <Coffee className="text-orange-400" size={40} />
              <h3 className="font-serif text-3xl font-bold tracking-wide">
                MyNook
              </h3>
            </div>
            <blockquote className="text-xl font-light italic mb-4 opacity-90 border-l-4 border-[#e9590c] pl-4 leading-relaxed">
              &ldquo;The best work happens in the most unexpected corners. Join our
              community to find yours.&rdquo;
            </blockquote>
            <div className="flex items-center space-x-2 text-sm font-medium text-orange-200">
              <MapPin size={18} />
              <span>Discover spaces curated just for you.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
