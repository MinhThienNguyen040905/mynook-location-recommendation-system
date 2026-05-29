'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addFavorite, listFavoriteIds, removeFavorite,
} from '@/lib/api/favorites';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  venueId: string;
  variant?: 'default' | 'compact';
  className?: string;
}

export function FavoriteButton({
  venueId,
  variant = 'default',
  className,
}: FavoriteButtonProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isLoading: authLoading } = useAuthStore();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ['favorite-ids'],
    queryFn: listFavoriteIds,
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const isFav = optimistic ?? favoriteIds.includes(venueId);

  useEffect(() => {
    setOptimistic(null);
  }, [favoriteIds, venueId]);

  const addMut = useMutation({
    mutationFn: () => addFavorite(venueId),
    onMutate: () => setOptimistic(true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorite-ids'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Đã thêm vào yêu thích');
    },
    onError: () => {
      setOptimistic(null);
      toast.error('Thêm yêu thích thất bại');
    },
  });

  const removeMut = useMutation({
    mutationFn: () => removeFavorite(venueId),
    onMutate: () => setOptimistic(false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorite-ids'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Đã bỏ khỏi yêu thích');
    },
    onError: () => {
      setOptimistic(null);
      toast.error('Bỏ yêu thích thất bại');
    },
  });

  const isPending = addMut.isPending || removeMut.isPending;

  function handleClick() {
    if (authLoading) return;
    if (!user) {
      toast.info('Đăng nhập để lưu venue vào yêu thích');
      router.push('/login');
      return;
    }
    if (isFav) removeMut.mutate();
    else addMut.mutate();
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title={isFav ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
        aria-label={isFav ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
        className={cn(
          'size-9 rounded-full flex items-center justify-center transition-all border shadow-sm',
          isFav
            ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
            : 'bg-white/95 text-slate-600 border-slate-200 hover:text-red-500 hover:border-red-200',
          isPending && 'opacity-70 cursor-wait',
          className,
        )}
      >
        {isPending ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Heart size={15} className={isFav ? 'fill-current' : ''} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || isLoading}
      aria-label={isFav ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all',
        isFav
          ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 shadow-sm shadow-red-200'
          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:text-red-500 hover:border-red-300',
        (isPending || isLoading) && 'opacity-70 cursor-wait',
        className,
      )}
    >
      {isPending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Heart size={16} className={isFav ? 'fill-current' : ''} />
      )}
      {isFav ? 'Đã yêu thích' : 'Yêu thích'}
    </button>
  );
}
