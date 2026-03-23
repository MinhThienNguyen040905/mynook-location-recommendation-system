import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-4xl font-bold tracking-tight">MyNook</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Khám phá và đánh giá các địa điểm yêu thích — quán cà phê, nhà hàng,
        không gian làm việc và hơn thế nữa.
      </p>
      <div className="flex gap-3">
        <Button>Khám phá ngay</Button>
        <Button variant="outline">Đăng nhập</Button>
      </div>
    </div>
  );
}
