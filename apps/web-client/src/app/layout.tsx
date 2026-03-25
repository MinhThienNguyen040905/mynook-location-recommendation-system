import type { Metadata } from 'next';
import './global.css';

export const metadata: Metadata = {
  title: 'MyNook — Khám phá địa điểm yêu thích',
  description:
    'Khám phá và đánh giá các địa điểm yêu thích — quán cà phê, nhà hàng, không gian làm việc và hơn thế nữa.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
