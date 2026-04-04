"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff, MapPin, Coffee, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { login } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { loginSchema, type LoginFormData } from "@/lib/validators/auth";
import { ROUTES } from "@/config/routes";
import { isAxiosError } from "axios";

export default function LoginPage() {
  const [role, setRole] = useState<"guest" | "owner">("guest");
  const [showPassword, setShowPassword] = useState(false);
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
    try {
      const res = await login(data);
      setUser(res.user);
      toast.success("Đăng nhập thành công!");

      // Redirect dựa trên account type
      if (res.user.type === "owner") {
        router.push(ROUTES.DASHBOARD);
      } else if (res.user.type === "admin") {
        router.push(ROUTES.ADMIN);
      } else {
        router.push(ROUTES.HOME);
      }
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        toast.error("Email hoặc mật khẩu không đúng");
      } else {
        toast.error("Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAF9] dark:bg-[#221610] font-sans overflow-hidden">
      {/* Left Side: Authentication Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-12 xl:p-24 overflow-y-auto relative">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="font-serif text-4xl text-[#e9590c] font-bold tracking-tight mb-6">
              MyNook
            </h1>
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
              Welcome back!
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please enter your details to sign in.
            </p>
          </div>

          {/* Role Tabs */}
          <div
            className="bg-gray-100 dark:bg-[#2d1e17] p-1 rounded-lg flex space-x-1"
            role="tablist"
          >
            <button
              onClick={() => setRole("guest")}
              className={cn(
                "flex-1 py-2 px-4 rounded text-sm font-medium transition-all duration-200 focus:outline-none",
                role === "guest"
                  ? "shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
              )}
            >
              I&apos;m a Guest
            </button>
            <button
              onClick={() => setRole("owner")}
              className={cn(
                "flex-1 py-2 px-4 rounded text-sm font-medium transition-all duration-200 focus:outline-none",
                role === "owner"
                  ? "shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
              )}
            >
              I&apos;m a Venue Owner
            </button>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ease-in-out group">
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
            <button className="flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ease-in-out group">
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
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
                    "block w-full pl-10 pr-3 py-3 border rounded-lg bg-white dark:bg-gray-800 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] sm:text-sm transition duration-150",
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
                    "block w-full pl-10 pr-10 py-3 border rounded-lg bg-white dark:bg-gray-800 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#e9590c] focus:border-[#e9590c] sm:text-sm transition duration-150",
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
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:to-orange-600 hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e9590c] transition-all duration-200 transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
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

        <div className="absolute bottom-6 text-xs text-gray-400 text-center w-full">
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
