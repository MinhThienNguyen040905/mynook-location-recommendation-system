'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Github, Chrome, Zap } from 'lucide-react';
import { NookLogo } from '@/components/shared/nook-logo';
import { motion } from 'motion/react';

const DEMO_ACCOUNTS = [
  { label: 'User',  email: 'user@mynook.dev',  role: 'user',  redirect: '/',      color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'       },
  { label: 'Owner', email: 'owner@mynook.dev', role: 'owner', redirect: '/',      color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' },
  { label: 'Admin', email: 'admin@mynook.dev', role: 'admin', redirect: '/admin', color: 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'    },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function loginAsDemo(role: string, redirect: string) {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `access_token=demo_token_${role}; expires=${expires}; path=/`;
    document.cookie = `user_role=${role}; expires=${expires}; path=/`;
    router.push(redirect);
  }

  return (
    <div className="min-h-screen flex items-stretch bg-nook-cream">
      {/* Left Side: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Logo — Link href replaces react-router-dom <Link to> */}
          <Link href="/" className="mb-12 inline-block">
            <NookLogo size="md" />
          </Link>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-4xl font-serif font-bold text-nook-ink mb-4">Welcome back</h1>
            <p className="text-nook-ink/60 mb-8">Sign in to access your saved nooks and reviews.</p>

            <form className="space-y-4 mb-8" onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-nook-ink/30" size={20} />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="nook-input pr-12"
                />
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-nook-ink/30" size={20} />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="nook-input pr-12"
                />
              </div>

              <div className="flex justify-end">
                {/* Internal link — use Next.js Link, not <a> */}
                <Link
                  href="/forgot-password"
                  className="text-sm text-nook-olive font-bold hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className="nook-button-primary w-full py-4 text-lg flex items-center justify-center gap-2 group"
              >
                <span>Sign In</span>
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mb-6 p-4 rounded-2xl border border-dashed border-nook-sand bg-nook-cream/40">
              <p className="text-xs font-bold text-nook-ink/40 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Zap size={12} /> Tài khoản demo
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    onClick={() => loginAsDemo(acc.role, acc.redirect)}
                    className={`flex flex-col items-start px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${acc.color}`}
                  >
                    <span className="font-bold">{acc.label}</span>
                    <span className="text-xs opacity-70 truncate w-full">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-nook-sand" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-nook-ink/40 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-12">
              <button className="nook-button-secondary flex items-center justify-center gap-2 py-3">
                <Chrome size={20} />
                <span>Google</span>
              </button>
              <button className="nook-button-secondary flex items-center justify-center gap-2 py-3">
                <Github size={20} />
                <span>GitHub</span>
              </button>
            </div>

            <p className="text-center text-nook-ink/60">
              Don&apos;t have an account?{' '}
              {/* Navigate to /register page instead of toggling state */}
              <Link href="/register" className="text-nook-olive font-bold hover:underline">
                Sign up now
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Image / Quote */}
      <div className="hidden lg:flex flex-1 relative bg-nook-olive overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1000"
            alt="Auth Background"
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nook-olive via-nook-olive/40 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-end p-24 text-white">
          <div className="w-16 h-1 bg-white mb-12 rounded-full" />
          <h2 className="text-5xl font-serif font-bold mb-8 leading-tight">
            &ldquo;The best work happens in the most unexpected corners.&rdquo;
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full border border-white/30" />
            <div>
              <p className="font-bold">Elena Vance</p>
              <p className="text-white/60 text-sm italic">Architect & Digital Nomad</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
