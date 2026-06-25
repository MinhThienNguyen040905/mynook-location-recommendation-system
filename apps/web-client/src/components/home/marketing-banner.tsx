import Link from "next/link";

export function MarketingBanner() {
  return (
    <section className="bg-[#578F6A] mt-16 py-16 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
        <div className="text-white max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4">
            Bạn đang sở hữu một địa điểm ấm cúng?
          </h2>
          <p className="text-lg text-white/90 leading-relaxed">
            Đồng hành cùng MyNook để tiếp cận những người đang tìm địa điểm yêu
            thích tiếp theo. Quản lý đặt chỗ, giới thiệu không gian và phát
            triển cộng đồng của bạn.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link
            href="/register"
            className="inline-block bg-white text-[#578F6A] hover:bg-slate-100 font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            Đăng ký địa điểm của bạn
          </Link>
        </div>
      </div>
    </section>
  );
}
