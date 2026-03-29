'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Bọc toàn bộ app với TanStack Query client.
 * Khai báo là 'use client' vì QueryClientProvider cần browser context.
 * Đặt ở root layout để tất cả trang đều dùng được useQuery/useMutation.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState đảm bảo mỗi request tạo một QueryClient riêng (không share giữa users)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // data được coi là fresh trong 60 giây
            retry: 1,             // retry 1 lần nếu request thất bại
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
