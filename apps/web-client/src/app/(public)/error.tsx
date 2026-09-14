'use client';

export default function PublicError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-nook-ink">Chưa tải được dữ liệu</h1>
      <p className="mt-3 text-nook-ink/60">MyNook đang kết nối lại. Bạn vui lòng thử lại sau ít giây.</p>
      <button onClick={reset} className="nook-button-primary mt-6">Thử lại</button>
    </main>
  );
}
