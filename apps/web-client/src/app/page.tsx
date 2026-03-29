'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  ArrowRight,
  Sparkles,
  Coffee,
  BookOpen,
  Laptop,
  Brain,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_VENUES } from '@/data/mockVenues';
import { VenueCard } from '@/components/venue/venue-card';
import { getNookRecommendation } from '@/lib/gemini';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/navbar';

export default function HomePage() {
  const router = useRouter(); // replaces useNavigate()
  const [mood, setMood] = useState('');
  const [activity, setActivity] = useState('');
  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  const handleHomeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (homeSearchQuery.trim()) {
      // router.push replaces navigate()
      router.push(`/search?q=${encodeURIComponent(homeSearchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  };

  const categories = [
    { name: 'Quiet Cafes', icon: <Coffee size={24} />, color: 'bg-orange-100 text-orange-600' },
    { name: 'Libraries', icon: <BookOpen size={24} />, color: 'bg-blue-100 text-blue-600' },
    { name: 'Workspaces', icon: <Laptop size={24} />, color: 'bg-purple-100 text-purple-600' },
    { name: 'Outdoor Nooks', icon: <Sparkles size={24} />, color: 'bg-green-100 text-green-600' },
  ];

  const handleGetAIRecommendation = async () => {
    if (!mood || !activity) return;
    setIsLoading(true);
    const res = await getNookRecommendation(mood, activity);
    setRecommendations(res);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000"
            alt="Hero Background"
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-nook-cream/20 via-nook-cream/60 to-nook-cream" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 bg-nook-olive/10 text-nook-olive text-sm font-bold tracking-widest uppercase rounded-full mb-6">
              Discover Your Perfect Corner
            </span>
            <h1 className="text-6xl md:text-8xl font-serif font-bold text-nook-ink leading-[1.1] mb-8">
              Find the best <span className="text-nook-olive italic">nook</span> for your work.
            </h1>
            <p className="text-xl text-nook-ink/60 max-w-2xl mx-auto mb-12 leading-relaxed">
              Whether you need absolute silence for deep work or a cozy cafe for creative flow,
              we&apos;ve curated the best spots in the city just for you.
            </p>

            <form
              onSubmit={handleHomeSearch}
              className="max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-xl shadow-nook-olive/10 border border-nook-sand flex flex-col md:flex-row items-stretch gap-2"
            >
              <div className="flex-1 flex items-center gap-3 px-4 py-3 border-b md:border-b-0 md:border-r border-nook-sand">
                <MapPin className="text-nook-olive" size={20} />
                <input
                  type="text"
                  value={homeSearchQuery}
                  onChange={(e) => setHomeSearchQuery(e.target.value)}
                  placeholder="Where are you looking?"
                  className="w-full bg-transparent border-none focus:ring-0 text-nook-ink placeholder:text-nook-ink/30"
                />
              </div>
              <button
                type="submit"
                className="nook-button-primary flex items-center justify-center gap-2 group"
              >
                <Search size={20} />
                <span>Search Nooks</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-nook-ink mb-4">Explore by Vibe</h2>
            <p className="text-nook-ink/60">Find the perfect atmosphere for your current mood.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
              >
                <div className="nook-card p-8 flex flex-col items-center text-center transition-all group-hover:bg-nook-olive group-hover:border-nook-olive">
                  <div
                    className={cn(
                      'w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors group-hover:bg-white/20 group-hover:text-white',
                      cat.color
                    )}
                  >
                    {cat.icon}
                  </div>
                  <h3 className="text-xl font-serif font-bold text-nook-ink group-hover:text-white transition-colors">
                    {cat.name}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Nook Finder Section */}
      <section className="py-24 bg-nook-cream/50 border-y border-nook-sand overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-600 rounded-lg text-xs font-bold uppercase tracking-wider mb-6">
                <Brain size={14} />
                <span>Powered by Gemini AI</span>
              </div>
              <h2 className="text-5xl font-serif font-bold text-nook-ink mb-6 leading-tight">
                Can&apos;t decide? Let our{' '}
                <span className="text-purple-600">AI Nook Finder</span> help.
              </h2>
              <p className="text-lg text-nook-ink/60 mb-8">
                Tell us how you&apos;re feeling and what you need to get done, and we&apos;ll
                recommend the perfect environment for your productivity.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-nook-ink/40 uppercase tracking-widest">
                    How are you feeling?
                  </label>
                  <input
                    type="text"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="e.g. Focused, Creative, Tired, Inspired..."
                    className="nook-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-nook-ink/40 uppercase tracking-widest">
                    What are you working on?
                  </label>
                  <input
                    type="text"
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    placeholder="e.g. Writing a thesis, Coding, Reading a novel..."
                    className="nook-input"
                  />
                </div>
                <button
                  onClick={handleGetAIRecommendation}
                  disabled={isLoading || !mood || !activity}
                  className="nook-button bg-purple-600 text-white w-full py-4 font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} />
                      <span>Get AI Recommendation</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="relative min-h-[400px]">
              <AnimatePresence mode="wait">
                {recommendations ? (
                  <motion.div
                    key="recommendations"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {recommendations.map((rec: any, i: number) => (
                      <motion.div
                        key={rec.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="nook-card p-6 bg-white border-purple-100 shadow-lg shadow-purple-600/5"
                      >
                        <h4 className="text-xl font-serif font-bold text-purple-600 mb-2">
                          {rec.name}
                        </h4>
                        <p className="text-sm text-nook-ink/70 mb-4">{rec.reason}</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.features.map((f: string) => (
                            <span
                              key={f}
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-purple-50 text-purple-600 rounded"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                    <button
                      onClick={() => setRecommendations(null)}
                      className="text-sm text-purple-600 font-bold hover:underline"
                    >
                      Try another mood
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-nook-sand rounded-3xl"
                  >
                    <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6">
                      <Brain size={40} />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-nook-ink mb-2">
                      Your AI Nook Guide
                    </h3>
                    <p className="text-sm text-nook-ink/40">
                      Enter your mood and activity to get personalized environment suggestions.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Nooks */}
      <section className="py-24 bg-nook-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-4xl font-serif font-bold text-nook-ink mb-4">
                Highly Rated Nooks
              </h2>
              <p className="text-nook-ink/60">The most loved spots by our community this week.</p>
            </div>
            {/* Next.js Link — href replaces to */}
            <Link
              href="/search"
              className="hidden md:flex items-center gap-2 text-nook-olive font-bold hover:underline"
            >
              <span>View all nooks</span>
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {MOCK_VENUES.map((venue, i) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <VenueCard venue={venue} />
              </motion.div>
            ))}
          </div>

          <div className="mt-12 md:hidden">
            <Link
              href="/search"
              className="nook-button-secondary w-full flex items-center justify-center gap-2"
            >
              <span>View all nooks</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 bg-nook-olive text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-nook-clay/20 rounded-full -ml-48 -mb-48 blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-5xl font-serif font-bold mb-8 leading-tight">
            Ready to find your next favorite study spot?
          </h2>
          <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">
            Join thousands of students, freelancers, and remote workers who use MyNook to find
            their perfect corner every day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* /auth → /login (route renamed in Next.js) */}
            <Link
              href="/login"
              className="nook-button bg-white text-nook-olive px-10 py-4 font-bold text-lg hover:bg-nook-cream"
            >
              Get Started for Free
            </Link>
            <Link
              href="/search"
              className="nook-button border border-white/30 text-white px-10 py-4 font-bold text-lg hover:bg-white/10"
            >
              Browse Locations
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-nook-sand">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-nook-olive rounded-lg flex items-center justify-center text-white">
              <MapPin size={18} />
            </div>
            <span className="text-xl font-serif font-bold text-nook-olive">MyNook</span>
          </div>
          <p className="text-nook-ink/40 text-sm mb-8">
            © 2026 MyNook. All rights reserved. Built for the community.
          </p>
          <div className="flex items-center justify-center gap-8 text-nook-ink/60 text-sm font-medium">
            {/* External / placeholder links — keep as <a> */}
            <a href="#" className="hover:text-nook-olive">Privacy Policy</a>
            <a href="#" className="hover:text-nook-olive">Terms of Service</a>
            <a href="#" className="hover:text-nook-olive">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
