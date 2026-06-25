import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/home/hero-section";
import { RecentlyViewedSection } from "@/components/home/recently-viewed-section";
import { RecommendedSection } from "@/components/home/recommended-section";
import { TopRatedSection } from "@/components/home/top-rated-section";
import { AllVenuesSection } from "@/components/home/all-venues-section";
import { MarketingBanner } from "@/components/home/marketing-banner";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] bg-[#f8f6f5] dark:bg-[#221610] font-sans">
      <HeroSection />
      <RecentlyViewedSection />
      <RecommendedSection />
      <TopRatedSection />
      <AllVenuesSection />
      <MarketingBanner />
      <Footer />
    </div>
  );
}
