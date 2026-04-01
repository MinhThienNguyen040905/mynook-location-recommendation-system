import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/home/hero-section";
import { CategoryPills } from "@/components/home/category-pills";
import { TrendingSection } from "@/components/home/trending-section";
import { MarketingBanner } from "@/components/home/marketing-banner";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8f6f5] dark:bg-[#221610] font-sans">
      <Navbar />
      <HeroSection />
      <CategoryPills />
      <TrendingSection />
      <MarketingBanner />
      <Footer />
    </div>
  );
}
