// src/app/(public)/page.tsx
import React from "react";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-light/80 to-background-light dark:via-background-dark/80 dark:to-background-dark z-10"></div>
          <div className="absolute w-full h-full flex">
            <div
              className="w-1/2 h-full bg-cover bg-center"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDHhnr6WtBn_wrrnPjefDiZKWIshzjBT1bmLW5Y2TbKVwFDqtcDCKfQuGOhmEx0IGafJx6iDe3jsRqqdzZjRgDgqmy3H3iJDK6sh0ZmWyMyUa6F-UGCe0CHJoKHkrBRLW9BMo7TBhBG0tbEFxONhOgtv7c-oUaeEhbhyLR-R_bNlrrKmsH9Ipa7eS6Hy0RNzg-BJOqo81H4SmWhv2ozQP2l_FYvDyX9MS9Lss1pe6JNQGnW16DYaw78WlF8GvtlWlq2bJtYRjgK79w")',
              }}
            ></div>
            <div
              className="w-1/2 h-full bg-cover bg-center"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBq8Rx9pLR2f6JnoYNvDhsiWtA88l9wvkSkrbImFF8gTnlGDzUgsR1UN0cWcdGWNq3WKqPFGywkbiUr1Bqs9gFxl2o3RrJweo9lFVC_yGvZBR2z9c-x1_G-JNufD2IzmZEnhQ05v55K9xvc86zP0Y2Q4eYgCKWNI5dECF_t2iRuJt8vt7sLBkt-LKKZwvWs_AHngrOt-dBymuRufI4PBtKpEorY03oPhOmm2jWCfv30xzGnGaKmeevxt4L6dtxo8RdRvxMUaWJPyPo")',
              }}
            ></div>
          </div>
        </div>
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 drop-shadow-sm">
            Find your perfect{" "}
            <span className="text-primary italic font-serif">nook.</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-700 dark:text-slate-200 font-medium drop-shadow-md">
            Discover the best spots for dining, working, or simply unwinding
            nearby.
          </p>

          <div className="mt-10 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-3 flex flex-col md:flex-row items-center gap-3 border border-slate-100 dark:border-slate-700">
              <div className="relative flex-grow w-full md:w-auto group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-icons text-slate-400 group-focus-within:text-primary transition-colors">
                    search
                  </span>
                </div>
                <input
                  className="block w-full pl-12 pr-4 py-3 bg-transparent border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-slate-50 dark:focus:bg-slate-700/50 transition-all text-base focus:outline-none"
                  placeholder="Try 'Quiet cafe in District 1...'"
                  type="text"
                />
              </div>
              <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-600"></div>
              <div className="relative w-full md:w-64 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-icons text-slate-400 group-focus-within:text-primary transition-colors">
                    place
                  </span>
                </div>
                <select className="block w-full pl-12 pr-10 py-3 bg-transparent border-none rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:bg-slate-50 dark:focus:bg-slate-700/50 cursor-pointer appearance-none transition-all text-base focus:outline-none">
                  <option>Current Location</option>
                  <option>New York, NY</option>
                  <option>San Francisco, CA</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <span className="material-icons text-slate-400 text-sm">
                    expand_more
                  </span>
                </div>
              </div>
              <button className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-primary/30 transition-all duration-200 flex items-center justify-center gap-2">
                <span>Search</span>
                <span className="material-icons text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 sticky top-20 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex space-x-4 overflow-x-auto hide-scrollbar pb-2 md:pb-0 md:justify-center">
            <button className="flex items-center space-x-2 px-5 py-2.5 bg-primary text-white rounded-full shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap">
              <span className="material-icons text-sm">restaurant</span>
              <span className="text-sm font-semibold">Dining</span>
            </button>
            <button className="flex items-center space-x-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:border-primary hover:text-primary transition-all whitespace-nowrap">
              <span className="material-icons text-sm">coffee</span>
              <span className="text-sm font-medium">Cafe</span>
            </button>
            <button className="flex items-center space-x-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:border-primary hover:text-primary transition-all whitespace-nowrap">
              <span className="material-icons text-sm">laptop_mac</span>
              <span className="text-sm font-medium">Work/Study</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              Trending Near You
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Highly rated spots curated for you.
            </p>
          </div>
          <a
            className="hidden sm:flex items-center text-primary font-semibold hover:text-primary/80 transition-colors"
            href="#"
          >
            View all
            <span className="material-icons ml-1 text-sm">arrow_forward</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
            <div className="relative h-56 overflow-hidden">
              <img
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBx220HvpvuwpZ8XM22XnSF4Lxf1sWE71tq4pCgl5v97BVhR9TZHflhYzTILLEdY4nJBmlxcYsHTEfthrbPN8chr5yfMY61woeqV6cuhotTte8GFfAKa4qByjocNihoHRCPgtPQX4vJ2C5K9m_tiIw2qs1z9OjvVIZMxrIiBI3v17Y7JlKuDF0eBBhtypAo49_GHBEG5yJqO8lPX45HzSztwkvjXvE8I8RG_FYCu09tHMHE968wgNYUdxY-4F6Tkgub1HgaihMDBQQ"
                alt="The Bean Hive"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
              <div className="absolute top-4 left-4 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-sm">
                <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                Plenty of Seats
              </div>
              <button className="absolute top-4 right-4 bg-white/20 hover:bg-white backdrop-blur-md p-2 rounded-full text-white hover:text-primary transition-colors">
                <span className="material-icons text-xl block">
                  favorite_border
                </span>
              </button>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                  The Bean Hive
                </h3>
                <div className="flex items-center bg-primary/10 px-2 py-1 rounded-lg">
                  <span className="material-icons text-primary text-sm mr-1">
                    star
                  </span>
                  <span className="text-sm font-bold text-primary">4.8</span>
                </div>
              </div>
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  $$
                </span>
                <span className="mx-2">•</span>
                <span>Cafe & Bakery</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                  Wifi
                </span>
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                  Outlets
                </span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
            <div className="relative h-56 overflow-hidden">
              <img
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjFF9lLJbOlLPnXx0RYrUgUAJl4D59Doix8JGT_vCrTvxWInaZ0Yb5ohXY0XJ4B467BkZEcRkRAzll6nfxDKlsuiQMmz0PCv_sanqYrxMYyT00QI92z-YvvQo2zqCOij29iQEevyDQ1h_1E_fgWIWOIaApqs3VFbHHhsxSqW71ahd8hectVdw6lF7yVDxjLuP9RqsIK-M3hg-lnCkyrlFqke9f6RDIMtgTJ3wzw6NrcvQHvrE5qm4FTqA_tVHS5g8D_y7nb_W06Bo"
                alt="Pasta & Vine"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
              <div className="absolute top-4 left-4 bg-orange-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-sm">
                <span className="w-2 h-2 bg-white rounded-full mr-2"></span>{" "}
                Busy
              </div>
              <button className="absolute top-4 right-4 bg-white/20 hover:bg-white backdrop-blur-md p-2 rounded-full text-white hover:text-primary transition-colors">
                <span className="material-icons text-xl block">
                  favorite_border
                </span>
              </button>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                  Pasta & Vine
                </h3>
                <div className="flex items-center bg-primary/10 px-2 py-1 rounded-lg">
                  <span className="material-icons text-primary text-sm mr-1">
                    star
                  </span>
                  <span className="text-sm font-bold text-primary">4.6</span>
                </div>
              </div>
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  $$$
                </span>
                <span className="mx-2">•</span>
                <span>Italian Dining</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                  Wine Bar
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Marketing Banner */}
      <section className="bg-sage-green mt-16 py-16 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="text-white max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4">
              Own a cozy spot?
            </h2>
            <p className="text-lg text-white/90 leading-relaxed">
              Partner with MyNook to reach thousands of people looking for their
              next favorite hangout. Manage reservations, showcase your
              atmosphere, and grow your community.
            </p>
          </div>
          <div className="flex-shrink-0">
            <a
              className="inline-block bg-white text-sage-green hover:bg-slate-100 font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              href="#"
            >
              Register your Venue
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
