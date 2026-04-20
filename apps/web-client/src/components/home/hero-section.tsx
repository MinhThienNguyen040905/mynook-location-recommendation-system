"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Mic, Loader2 } from "lucide-react";
import { useVoiceSearch } from "@/hooks/use-voice-search";

export function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleVoiceResult = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const { state: voiceState, error: voiceError, toggle: toggleVoice } = useVoiceSearch(handleVoiceResult);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/search");
    }
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f8f6f5]/80 to-[#f8f6f5] dark:via-[#221610]/80 dark:to-[#221610] z-10" />
        <div className="absolute w-full h-full flex">
          <div
            className="w-1/2 h-full bg-cover bg-center"
            style={{
              backgroundImage:
                'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000")',
            }}
          />
          <div
            className="w-1/2 h-full bg-cover bg-center"
            style={{
              backgroundImage:
                'url("https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1000")',
            }}
          />
        </div>
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 drop-shadow-sm font-sans">
          Find your perfect{" "}
          <span className="text-[#e9590c] italic font-serif">nook.</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-700 dark:text-slate-200 font-medium drop-shadow-md">
          Discover the best spots for dining, working, or simply unwinding
          nearby.
        </p>

        {/* Search Box */}
        <div className="mt-10 max-w-4xl mx-auto">
          <form
            onSubmit={handleSearch}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-3 flex flex-col md:flex-row items-center gap-3 border border-slate-100 dark:border-slate-700"
          >
            {/* Keyword Input */}
            <div className="relative flex-grow w-full md:w-auto group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search
                  className="text-slate-400 group-focus-within:text-[#e9590c] transition-colors"
                  size={20}
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-12 py-3 bg-transparent border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#e9590c]/20 focus:bg-slate-50 dark:focus:bg-slate-700/50 transition-all text-base outline-none"
                placeholder="Try 'Quiet cafe in District 1...'"
              />
              <button
                type="button"
                onClick={toggleVoice}
                disabled={voiceState === "transcribing"}
                title={
                  voiceState === "recording"
                    ? "Stop recording"
                    : voiceState === "transcribing"
                      ? "Transcribing..."
                      : "Search by voice"
                }
                className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors ${
                  voiceState === "recording"
                    ? "text-red-500 animate-pulse"
                    : voiceState === "transcribing"
                      ? "text-[#e9590c]"
                      : "text-slate-400 hover:text-[#e9590c]"
                }`}
              >
                {voiceState === "transcribing" ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Mic size={20} />
                )}
              </button>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="w-full md:w-auto bg-[#e9590c] hover:bg-[#e9590c]/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-[#e9590c]/30 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Search</span>
              <ArrowRight size={18} />
            </button>
          </form>
          {voiceError && (
            <p className="mt-2 text-sm text-red-500">{voiceError}</p>
          )}
        </div>
      </div>
    </section>
  );
}
