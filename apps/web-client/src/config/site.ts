export const siteConfig = {
  name: 'MyNook',
  description:
    'Khám phá và đánh giá các địa điểm yêu thích - quán cà phê, nhà hàng, không gian làm việc và hơn thế nữa.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;

export const navLinks = {
  public: [
    { label: 'Trang chủ', href: '/' },
    { label: 'Tìm kiếm', href: '/search' },
  ],
  user: [
    { label: 'Đặt chỗ', href: '/bookings' },
    { label: 'Yêu thích', href: '/favorites' },
    { label: 'Tài khoản', href: '/profile' },
  ],
  owner: [
    { label: 'Tổng quan', href: '/dashboard' },
    { label: 'Địa điểm', href: '/dashboard/venue' },
    { label: 'Menu', href: '/dashboard/menu' },
    { label: 'Đặt chỗ', href: '/dashboard/bookings' },
    { label: 'Đánh giá', href: '/dashboard/reviews' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Người dùng', href: '/admin/users' },
    { label: 'Địa điểm', href: '/admin/venues' },
    { label: 'Báo cáo', href: '/admin/reports' },
  ],
} as const;
