"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff, MapPin, Coffee, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { login, loginDemo } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { loginSchema, type LoginFormData } from "@/lib/validators/auth";
import { ROUTES } from "@/config/routes";
import { isAxiosError } from "axios";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [demoRole, setDemoRole] = useState<'customer' | 'owner' | null>(null);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    if (demoRole) return;
    try {
      const res = await login(data);
      setUser(res.user);
      toast.success("Đăng nhập thành công!");

      // Redirect dựa trên account type — admin & customer vào Home, owner vào Dashboard
      if (res.user.type === "owner") {
        router.push(ROUTES.DASHBOARD);
      } else {
        router.push(ROUTES.HOME);
      }
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          toast.error("Email hoặc mật khẩu không đúng");
        } else if (status === 400) {
          toast.error(error.response?.data?.message || "Dữ liệu không hợp lệ");
        } else if (!error.response) {
          toast.error("Không thể kết nối đến máy chủ. Kiểm tra backend đã chạy chưa.");
        } else {
          toast.error(`Lỗi máy chủ (${status}): ${error.response?.data?.message ?? "Vui lòng thử lại."}`);
        }
      } else {
        toast.error("Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
      console.error("[Login error]", error);
    }
  }

  async function tryDemo(role: 'customer' | 'owner') {
    if (demoRole || isSubmitting) return;
    setDemoRole(role);
    try {
      const res = await loginDemo(role);
      setUser(res.user);
      toast.success(role === 'owner' ? 'Chào mừng đến dashboard chủ quán mẫu!' : 'Bạn đang dùng thử với vai trò khách hàng.');
      // Reload to clear cached data when switching between shared demo roles.
      window.location.assign(role === 'owner' ? '/dashboard' : `/venues/${res.user.demo_venue_id}`);
    } catch (error) {
      toast.error(isAxiosError(error) && error.response?.status === 429
        ? 'Bạn đã dùng thử nhiều lần. Vui lòng chờ vài phút rồi thử lại.'
        : 'Chưa thể mở bản demo. Vui lòng thử lại sau ít giây.');
      setDemoRole(null);
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAF9] dark:bg-[#221610] font-sans overflow-hidden">
      {/* Left Side: Authentication Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center p-6 lg:p-10 overflow-y-auto relative">
        <div className="w-full max-w-md space-y-5 my-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="font-serif text-3xl text-[#e9590c] font-bold tracking-tight mb-1">
              MyNook
            </h1>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Welcome back!
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please enter your details to sign in.
            </p>
          </div>


          {process.env.NEXT_PUBLIC_DEMO_ENABLED === 'true' && (
            <section aria-label="Trải nghiệm demo" className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-3 text-slate-900">
              <h3 className="font-semibold">Khám phá MyNook trong một lần bấm</h3>
              <p className="text-sm text-slate-600">Không cần đăng ký hay nhập mật khẩu.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" disabled={!!demoRole || isSubmitting} onClick={() => tryDemo('customer')}
                  className="rounded-xl bg-orange-600 px-3 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {demoRole === 'customer' && <Loader2 size={16} className="animate-spin" />} Dùng thử khách hàng
                </button>
                <button type="button" disabled={!!demoRole || isSubmitting} onClick={() => tryDemo('owner')}
                  className="rounded-xl border border-orange-300 bg-white px-3 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60 flex items-center justify-center gap-2">
                  {demoRole === 'owner' && <Loader2 size={16} className="animate-spin" />} Dùng thử chủ quán
                </button>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">Khách hàng: lưu yêu thích, viết đánh giá tại quán mẫu. Chủ quán: xem dashboard, menu và thống kê mẫu. Tài khoản dùng chung; không nhập thông tin cá nhân.</p>
              <Link href="/" className="inline-block text-sm font-medium text-orange-700 underline underline-offset-4">Khám phá không cần đăng nhập →</Link>
            </section>
          )}

          {/* Main Form */}
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#e9590c] focus:ring-[#e9590c] border-gray-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                >
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-[#e9590c] hover:text-[#c2410b] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !!demoRole}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:to-orange-600 hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e9590c] transition-all duration-200 transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#e9590c] hover:text-[#c2410b] transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>

        <div className="shrink-0 text-xs text-gray-400 text-center w-full pb-2">
          &copy; 2026 MyNook Inc. All rights reserved.
        </div>
      </div>

      {/* Right Side: Visual Anchor */}
      <div className="hidden lg:block lg:w-1/2 relative h-full">
        <img
          alt="Cozy cafe interior with warm sunlight"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
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
              &ldquo;Find your perfect spot to savor the moment and focus on what
              matters most.&rdquo;
            </blockquote>
            <div className="flex items-center space-x-2 text-sm font-medium text-orange-200">
              <MapPin size={18} />
              <span>Featured Nook: The Daily Grind, Seattle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
