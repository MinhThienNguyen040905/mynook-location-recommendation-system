'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Github, Chrome } from 'lucide-react';
import { NookLogo } from '@/components/shared/nook-logo';
import { motion } from 'motion/react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-stretch bg-nook-cream">
      {/* Left Side: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <Link href="/" className="mb-12 inline-block">
            <NookLogo size="md" />
          </Link>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-4xl font-serif font-bold text-nook-ink mb-4">Create an account</h1>
            <p className="text-nook-ink/60 mb-8">
              Join the community to discover and share the best spots.
            </p>

            <form className="space-y-4 mb-8" onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-nook-ink/30" size={20} />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="nook-input pr-12"
                />
              </div>
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

              <button
                type="submit"
                className="nook-button-primary w-full py-4 text-lg flex items-center justify-center gap-2 group"
              >
                <span>Create Account</span>
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>

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
              Already have an account?{' '}
              {/* Navigate to /login page instead of toggling state */}
              <Link href="/login" className="text-nook-olive font-bold hover:underline">
                Log in here
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
            alt="Register Background"
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
