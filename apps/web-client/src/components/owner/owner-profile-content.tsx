'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // replaces useNavigate
import { Star, Verified, Camera, User, Link as LinkIcon } from 'lucide-react';

export function OwnerProfileContent() {
  const router = useRouter();

  // Mock: kiểm tra owner đã có quán chưa
  const [hasVenue] = useState(true);

  const handleManageVenue = () => {
    if (!hasVenue) {
      alert('Bạn chưa có quán nào. Vui lòng tạo quán mới!');
    } else {
      // navigate("/manage-venue") → router.push("/dashboard/venue")
      router.push('/dashboard/venue');
    }
  };

  return (
    <div className="flex flex-1 w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
      <main className="flex-1 bg-white rounded-3xl border border-primary/5 shadow-sm p-6 lg:p-10">

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-100">
          <div className="relative group">
            <div
              className="size-32 rounded-3xl bg-cover bg-center shadow-xl ring-4 ring-white"
              style={{ backgroundImage: 'url("https://picsum.photos/seed/owner-profile/200/200")' }}
            />
            <button className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg hover:scale-105 transition-transform">
              <Camera className="size-4" />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900">Alex Rivera</h1>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                <Verified className="size-4 fill-current" />
                Chủ quán đã xác minh
              </div>
            </div>
            <p className="text-slate-500">Quản lý các không gian ăn uống nổi bật tại trung tâm Manhattan</p>
          </div>
          <button className="px-6 py-2.5 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
            Xem hồ sơ công khai
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
          <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 text-center sm:text-left">
            <p className="text-3xl font-bold text-primary">2</p>
            <p className="text-sm font-medium text-slate-600">Tổng địa điểm đang quản lý</p>
          </div>
          <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 text-center sm:text-left">
            <p className="text-3xl font-bold text-primary">14</p>
            <p className="text-sm font-medium text-slate-600">Đặt chỗ đang hoạt động</p>
          </div>
          <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <p className="text-3xl font-bold text-primary">4.9</p>
              <Star className="size-5 text-primary fill-current" />
            </div>
            <p className="text-sm font-medium text-slate-600">Đánh giá tổng quan</p>
          </div>
        </div>

        {/* Personal Information Form */}
        <div className="mt-12 bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <User className="size-5 text-primary" /> Thông tin cá nhân
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Họ và tên</label>
              <input
                type="text"
                defaultValue="Alex Rivera"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                placeholder="Nhập họ và tên"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Địa chỉ email</label>
              <input
                type="email"
                defaultValue="alex.rivera@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                placeholder="Nhập email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Số điện thoại</label>
              <input
                type="tel"
                defaultValue="+1 (555) 000-1234"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                placeholder="Nhập số điện thoại"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Vị trí</label>
              <input
                type="text"
                defaultValue="Manhattan, New York, NY"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                placeholder="Thành phố, khu vực"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700">Giới thiệu / Tóm tắt chuyên môn</label>
              <textarea
                rows={4}
                defaultValue="Quản lý các không gian ăn uống nổi bật tại trung tâm Manhattan. Yêu thích tạo ra trải nghiệm ẩm thực độc đáo và không khí thân thiện cho mọi vị khách."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white resize-none"
                placeholder="Chia sẻ đôi điều về bạn..."
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-8 bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <LinkIcon className="size-5 text-primary" /> Liên kết mạng xã hội và nghề nghiệp
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Hồ sơ LinkedIn</label>
              <input
                type="url"
                defaultValue="https://linkedin.com/in/alexrivera"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Instagram kinh doanh</label>
              <input
                type="url"
                defaultValue="https://instagram.com/alex_venues"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Website cá nhân</label>
              <input
                type="url"
                defaultValue="https://alexrivera.me"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        </div>

        {/* My Venues */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Địa điểm của tôi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: 'The Greenery', location: 'Upper West Side, NY', rating: '4.9', img: 'https://picsum.photos/seed/greenery/600/300' },
              { name: 'Urban Savor',  location: 'Chelsea, NY',         rating: '4.8', img: 'https://picsum.photos/seed/urbansavor/600/300' },
            ].map((venue) => (
              <div
                key={venue.name}
                className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-primary/40 transition-all shadow-sm"
              >
                <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url('${venue.img}')` }} />
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{venue.name}</h3>
                      <p className="text-sm text-slate-500">{venue.location}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-primary/5 rounded-lg">
                      <Star className="size-4 text-primary fill-current" />
                      <span className="text-xs font-bold text-primary">{venue.rating}</span>
                    </div>
                  </div>
                  {/* Nút Manage Venue — navigate("/manage-venue") → router.push("/dashboard/venue") */}
                  <button
                    onClick={handleManageVenue}
                    className="w-full py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold rounded-xl transition-all"
                  >
                    Quản lý địa điểm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-8 mt-8 border-t border-slate-100">
          <button className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
            Hủy
          </button>
          <button className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:-translate-y-0.5">
            Lưu thay đổi
          </button>
        </div>
      </main>
    </div>
  );
}
