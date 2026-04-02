import { Footer } from "@/components/layout/footer";
import { VenueHeader } from "@/components/venue-detail/venue-header";
import { VenueGallery } from "@/components/venue-detail/venue-gallery";
import { VenueAmenities } from "@/components/venue-detail/venue-amenities";
import { VenueLocationMap } from "@/components/venue-detail/venue-location-map";
import { BookingCard } from "@/components/venue-detail/booking-card";
import { BadgeCheck, Star } from "lucide-react";

export default function VenueDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="bg-[#f8f6f5] dark:bg-[#221610] min-h-screen flex flex-col font-sans">
      {/* Đã xóa <Navbar /> ở đây vì app/(public)/layout.tsx đã render nó rồi */}

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <VenueHeader />
        <VenueGallery />

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          {/* Left Column: Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700">
              <nav className="-mb-px flex space-x-8">
                <button className="border-[#e9590c] text-[#e9590c] whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                  Overview
                </button>
                <button className="border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                  Menu
                </button>
                <button className="border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                  Reviews{" "}
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-0.5 px-2 rounded-full text-xs ml-2">
                    128
                  </span>
                </button>
              </nav>
            </div>

            {/* Overview Section */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                About this space
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                A haven for digital nomads and coffee enthusiasts alike. The
                Workshop Coffee combines industrial aesthetics with warm,
                inviting corners perfect for deep work or casual catch-ups. We
                pride ourselves on our single-origin beans roasted in-house and
                a menu that fuels your productivity.
              </p>
            </section>

            <VenueAmenities />

            {/* Location Map */}
            <VenueLocationMap
              name="The Workshop Coffee"
              address="123 Coffee Street, District 1, Ho Chi Minh City"
              lat={10.7769}
              lng={106.7009}
            />

            {/* Popular Dishes */}
            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Popular Dishes
                </h3>
                <button className="text-[#e9590c] hover:text-[#c2410b] text-sm font-medium">
                  View Full Menu
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  {
                    title: "Avocado Sourdough",
                    price: "$12.50 • Breakfast",
                    img: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?auto=format&fit=crop&q=80&w=400",
                  },
                  {
                    title: "Signature Flat White",
                    price: "$4.50 • Coffee",
                    img: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=400",
                  },
                  {
                    title: "Almond Croissant",
                    price: "$5.00 • Bakery",
                    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400",
                  },
                ].map((dish, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3">
                      <img
                        src={dish.img}
                        alt={dish.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {dish.title}
                    </h4>
                    <p className="text-sm text-slate-500">{dish.price}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews Snippet */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                What people are saying
              </h3>
              <div className="p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100"
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                        Sarah Jenkins
                      </h5>
                      <span className="text-xs text-slate-500">2 days ago</span>
                    </div>
                  </div>
                  <div className="flex items-center px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium border border-green-100 dark:border-green-800">
                    <BadgeCheck size={14} className="mr-1" /> Verified Visit
                  </div>
                </div>
                <div className="flex text-[#e9590c] gap-0.5 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  "Absolutely love the vibe here. The wifi is incredibly fast
                  and reliable for video calls (quiet corners available). The
                  almond croissant is a must-try!"
                </p>
              </div>
              <button className="w-full py-3 mt-4 text-center border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Read all 128 reviews
              </button>
            </section>
          </div>

          {/* Right Column: Sticky Booking Card */}
          <div className="lg:col-span-1">
            <BookingCard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
