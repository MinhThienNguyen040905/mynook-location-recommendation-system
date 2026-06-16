'use client';

import axios from 'axios';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Link2,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  Send,
  Star,
  Store,
  Trash2,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { listCategories } from '@/lib/api/categories';
import { listCities, listDistricts } from '@/lib/api/locations';
import {
  ownerCreateGoogleMapsDraft,
  ownerEnrichGoogleMapsDraft,
  ownerGetGoogleMapsDraft,
  ownerListGoogleMapsDrafts,
  ownerPublishGoogleMapsDraft,
  ownerRejectGoogleMapsDraft,
  ownerUpdateGoogleMapsDraft,
  type GoogleMapsImportDraft,
  type GoogleMapsImportNormalizedPayload,
} from '@/lib/api/admin';

type DraftForm = Partial<GoogleMapsImportNormalizedPayload>;

const STATUS_FILTERS: Array<{ value: GoogleMapsImportDraft['status'] | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Draft' },
  { value: 'enriched', label: 'Đã enrich' },
  { value: 'ready', label: 'Sẵn sàng' },
  { value: 'duplicate', label: 'Trùng lặp' },
  { value: 'published', label: 'Đã publish' },
  { value: 'rejected', label: 'Đã từ chối' },
];

function apiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown; error?: unknown } | undefined;
    const message = data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.trim()) return message;
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (err.message) return err.message;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}

function missingPublishFields(payload: DraftForm): string[] {
  const missing: string[] = [];
  if (!payload.name?.trim()) missing.push('tên venue');
  if (!payload.address_line?.trim()) missing.push('địa chỉ');
  if (!payload.city_id) missing.push('thành phố');
  if (!payload.district_id) missing.push('quận/huyện');
  if (typeof payload.latitude !== 'number' || Number.isNaN(payload.latitude)) missing.push('latitude');
  if (typeof payload.longitude !== 'number' || Number.isNaN(payload.longitude)) missing.push('longitude');
  if ((payload.category_ids ?? []).length === 0) missing.push('danh mục');
  return missing;
}

export default function OwnerImportsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<GoogleMapsImportDraft['status'] | 'all'>('all');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>({});
  const [sourceInput, setSourceInput] = useState('');

  const draftsQuery = useQuery({
    queryKey: ['owner', 'imports', 'google-maps', statusFilter],
    queryFn: () => ownerListGoogleMapsDrafts(statusFilter === 'all' ? undefined : statusFilter),
    refetchOnWindowFocus: false,
  });

  const draftQuery = useQuery({
    queryKey: ['owner', 'imports', 'google-maps', 'detail', selectedDraftId],
    queryFn: () => ownerGetGoogleMapsDraft(selectedDraftId as string),
    enabled: Boolean(selectedDraftId),
    refetchOnWindowFocus: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ['public', 'categories'],
    queryFn: listCategories,
    refetchOnWindowFocus: false,
  });

  const citiesQuery = useQuery({
    queryKey: ['public', 'cities'],
    queryFn: listCities,
    refetchOnWindowFocus: false,
  });

  const cityId = form.city_id ?? '';
  const districtsQuery = useQuery({
    queryKey: ['public', 'districts', cityId],
    queryFn: () => listDistricts(cityId || undefined),
    enabled: Boolean(cityId),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!selectedDraftId && draftsQuery.data?.length) {
      setSelectedDraftId(draftsQuery.data[0].id);
    }
  }, [draftsQuery.data, selectedDraftId]);

  useEffect(() => {
    if (draftQuery.data) setForm(draftQuery.data.normalized_payload);
  }, [draftQuery.data]);

  const drafts = draftsQuery.data ?? [];
  const selectedDraft = draftQuery.data ?? drafts.find((draft) => draft.id === selectedDraftId) ?? null;
  const categories = categoriesQuery.data ?? [];
  const cities = citiesQuery.data ?? [];
  const districts = districtsQuery.data ?? [];
  const categoryIds = form.category_ids ?? [];
  const media = form.media ?? [];
  const reviews = form.selected_reviews ?? [];
  const missing = missingPublishFields(form);
  const readOnly = selectedDraft?.status === 'published' || selectedDraft?.status === 'rejected';

  const selectedCategoryNames = useMemo(
    () =>
      categories
        .filter((category) => categoryIds.includes(category.id))
        .map((category) => category.display_name)
        .join(', '),
    [categories, categoryIds],
  );

  function setField<K extends keyof GoogleMapsImportNormalizedPayload>(
    key: K,
    value: GoogleMapsImportNormalizedPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(id: string) {
    setForm((prev) => {
      const next = new Set(prev.category_ids ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const ids = Array.from(next);
      return {
        ...prev,
        category_ids: ids,
        primary_category_id:
          prev.primary_category_id && next.has(prev.primary_category_id)
            ? prev.primary_category_id
            : ids[0] ?? null,
      };
    });
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const input = sourceInput.trim();
      if (!input) throw new Error('Vui lòng nhập URL hoặc text Google Maps');
      return ownerCreateGoogleMapsDraft({ input, source_url: input });
    },
    onSuccess: (draft) => {
      setSourceInput('');
      setSelectedDraftId(draft.id);
      qc.invalidateQueries({ queryKey: ['owner', 'imports', 'google-maps'] });
      toast.success('Đã tạo draft import cho owner');
    },
    onError: (err) => toast.error(apiError(err, 'Tạo draft thất bại')),
  });

  const saveMutation = useMutation({
    mutationFn: () => ownerUpdateGoogleMapsDraft(selectedDraftId as string, form),
    onSuccess: (draft) => {
      setForm(draft.normalized_payload);
      qc.invalidateQueries({ queryKey: ['owner', 'imports', 'google-maps'] });
      toast.success('Đã lưu draft');
    },
    onError: (err) => toast.error(apiError(err, 'Lưu draft thất bại')),
  });

  const enrichMutation = useMutation({
    mutationFn: () => ownerEnrichGoogleMapsDraft(selectedDraftId as string),
    onSuccess: (draft) => {
      setForm(draft.normalized_payload);
      qc.invalidateQueries({ queryKey: ['owner', 'imports', 'google-maps'] });
      toast.success('Đã enrich draft');
    },
    onError: (err) => toast.error(apiError(err, 'Enrich thất bại')),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const missingFields = missingPublishFields(form);
      if (missingFields.length > 0) {
        throw new Error(`Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`);
      }
      if (selectedDraft?.status === 'duplicate' && selectedDraft.matched_venue_id) {
        const ok = window.confirm('Draft này có thể trùng venue đã có. Vẫn publish thành venue của bạn?');
        if (!ok) throw new Error('__PUBLISH_CANCELLED__');
      }
      await ownerUpdateGoogleMapsDraft(selectedDraftId as string, form);
      return ownerPublishGoogleMapsDraft(selectedDraftId as string);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['owner', 'imports', 'google-maps'] });
      qc.invalidateQueries({ queryKey: ['owner', 'imports', 'google-maps', 'detail', selectedDraftId] });
      toast.success(`Đã tạo venue owner: ${data.venue.name}`);
    },
    onError: (err) => {
      if (err instanceof Error && err.message === '__PUBLISH_CANCELLED__') return;
      toast.error(apiError(err, 'Publish owner venue thất bại'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => ownerRejectGoogleMapsDraft(selectedDraftId as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'imports', 'google-maps'] });
      qc.invalidateQueries({ queryKey: ['owner', 'imports', 'google-maps', 'detail', selectedDraftId] });
      toast.success('Đã từ chối draft');
    },
    onError: (err) => toast.error(apiError(err, 'Reject thất bại')),
  });

  const busy =
    saveMutation.isPending ||
    enrichMutation.isPending ||
    publishMutation.isPending ||
    rejectMutation.isPending;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-orange-600">Owner imports</p>
          <h1 className="text-3xl font-bold text-gray-950">Import quán từ Google Maps</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Draft ở đây là của owner hiện tại. Khi publish, venue được tạo vào danh sách quán của bạn.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <Store className="size-4" />
            Venues của tôi
          </Link>
        </Button>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="sourceInput">Google Maps URL hoặc text</Label>
            <Textarea
              id="sourceInput"
              value={sourceInput}
              onChange={(event) => setSourceInput(event.target.value)}
              placeholder="Paste link Google Maps place hoặc thông tin quán..."
              className="min-h-20 resize-none"
            />
          </div>
          <Button
            className="self-end bg-orange-600 hover:bg-orange-700"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Tạo draft
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label>Trạng thái</Label>
              {draftsQuery.isFetching && <Loader2 className="size-4 animate-spin text-gray-400" />}
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          <div className="space-y-2">
            {drafts.length === 0 ? (
              <Card className="border-dashed p-6 text-center text-sm text-gray-400">
                Chưa có draft owner nào.
              </Card>
            ) : (
              drafts.map((draft) => {
                const active = selectedDraftId === draft.id;
                return (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => setSelectedDraftId(draft.id)}
                    className={cn(
                      'w-full rounded-xl border bg-white p-3 text-left transition-all',
                      active
                        ? 'border-orange-500 shadow-sm ring-1 ring-orange-500'
                        : 'border-gray-200 hover:border-orange-200 hover:shadow-sm',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-bold text-gray-900">
                        {draft.normalized_payload.name || 'Untitled'}
                      </p>
                      <StatusBadge status={draft.status} compact />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                      {draft.normalized_payload.address_line || draft.source_url || '—'}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                      <span>{draft.normalized_payload.media?.length ?? 0} ảnh</span>
                      <span>·</span>
                      <span>{draft.normalized_payload.selected_reviews?.length ?? 0} review</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {!selectedDraft ? (
            <Card className="flex min-h-80 items-center justify-center p-8 text-center text-sm text-gray-400">
              Chọn draft bên trái hoặc tạo draft mới bằng URL Google Maps.
            </Card>
          ) : (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-950">
                        {form.name || selectedDraft.normalized_payload.name || 'Untitled'}
                      </h2>
                      <StatusBadge status={selectedDraft.status} />
                      {selectedDraft.matched_venue_id && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" />
                          Có thể trùng
                        </Badge>
                      )}
                    </div>
                    {selectedDraft.source_url && (
                      <a
                        href={selectedDraft.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600"
                      >
                        <Link2 className="size-3" />
                        Mở Google Maps
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedDraft.published_venue_id && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/venues/${selectedDraft.published_venue_id}`}>
                          <ExternalLink className="size-4" />
                          Xem venue
                        </Link>
                      </Button>
                    )}
                    {!readOnly && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => enrichMutation.mutate()} disabled={busy}>
                          {enrichMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RefreshCcw className="size-4" />
                          )}
                          Enrich
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={busy}>
                          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                          Lưu
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => publishMutation.mutate()}
                          disabled={busy || missing.length > 0}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {publishMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                          Publish owner venue
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => rejectMutation.mutate()} disabled={busy}>
                          <Trash2 className="size-4" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!readOnly && missing.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Cần bổ sung trước khi publish: {missing.join(', ')}.
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Tên quán">
                    <Input value={form.name ?? ''} onChange={(event) => setField('name', event.target.value)} disabled={readOnly} />
                  </Field>
                  <Field label="Tên chi nhánh">
                    <Input
                      value={form.branch_name ?? ''}
                      onChange={(event) => setField('branch_name', event.target.value || null)}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Địa chỉ">
                    <Input
                      value={form.address_line ?? ''}
                      onChange={(event) => setField('address_line', event.target.value)}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Phường/xã">
                    <Input value={form.ward ?? ''} onChange={(event) => setField('ward', event.target.value || null)} disabled={readOnly} />
                  </Field>
                  <Field label="Thành phố">
                    <Select
                      value={form.city_id ?? undefined}
                      onValueChange={(value) => {
                        setField('city_id', value);
                        setField('district_id', null);
                      }}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Quận/huyện">
                    <Select
                      value={form.district_id ?? undefined}
                      onValueChange={(value) => setField('district_id', value)}
                      disabled={readOnly || !form.city_id}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn quận/huyện" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district.id} value={district.id}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Latitude">
                    <Input
                      type="number"
                      value={form.latitude ?? ''}
                      onChange={(event) => setField('latitude', event.target.value ? Number(event.target.value) : null)}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Longitude">
                    <Input
                      type="number"
                      value={form.longitude ?? ''}
                      onChange={(event) => setField('longitude', event.target.value ? Number(event.target.value) : null)}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Số điện thoại">
                    <Input
                      value={form.phone_number ?? ''}
                      onChange={(event) => setField('phone_number', event.target.value || null)}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Website">
                    <Input value={form.website ?? ''} onChange={(event) => setField('website', event.target.value || null)} disabled={readOnly} />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Mô tả">
                    <Textarea
                      value={form.description ?? ''}
                      onChange={(event) => setField('description', event.target.value || null)}
                      disabled={readOnly}
                      className="min-h-28"
                    />
                  </Field>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-950">Danh mục</h3>
                    <p className="text-xs text-gray-400">{selectedCategoryNames || 'Chưa chọn danh mục'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const active = categoryIds.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleCategory(category.id)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                          active
                            ? 'border-orange-600 bg-orange-600 text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600',
                        )}
                      >
                        {category.display_name}
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-950">
                  <ImageIcon className="size-4 text-orange-500" />
                  Ảnh venue
                </h3>
                {media.length === 0 ? (
                  <Empty text="Chưa có ảnh venue." />
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {media.map((url, index) => (
                      <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                        <img src={url} alt={`Venue media ${index + 1}`} className="size-full object-cover" />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setField('media', media.filter((_, i) => i !== index))}
                            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-600 opacity-0 shadow transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-950">
                  <Star className="size-4 text-orange-500" />
                  Review được import
                </h3>
                {reviews.length === 0 ? (
                  <Empty text="Chưa có review nào trong draft." />
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review, index) => (
                      <div key={`${review.source_review_id ?? index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{review.author_name || 'Google Maps user'}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-orange-600">
                              <Star className="size-3 fill-current" />
                              {review.rating}/5
                              {review.published_at ? <span className="text-gray-400">· {review.published_at}</span> : null}
                            </p>
                          </div>
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setField('selected_reviews', reviews.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-600">{review.content}</p>
                        {(review.media ?? []).length > 0 && (
                          <div className="mt-3 flex gap-2 overflow-x-auto">
                            {(review.media ?? []).map((url, mediaIndex) => (
                              <img
                                key={`${url}-${mediaIndex}`}
                                src={url}
                                alt={`Review media ${mediaIndex + 1}`}
                                className="size-16 shrink-0 rounded-lg object-cover"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status: GoogleMapsImportDraft['status']; compact?: boolean }) {
  const map: Record<GoogleMapsImportDraft['status'], { label: string; className: string; icon?: React.ReactNode }> = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
    enriched: { label: 'Enriched', className: 'bg-blue-50 text-blue-700' },
    ready: { label: 'Ready', className: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 className="size-3" /> },
    duplicate: { label: 'Duplicate', className: 'bg-amber-50 text-amber-700', icon: <AlertTriangle className="size-3" /> },
    published: { label: 'Published', className: 'bg-orange-50 text-orange-700', icon: <CheckCircle2 className="size-3" /> },
    rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  };
  const item = map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        item.className,
      )}
    >
      {item.icon}
      {item.label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">
      <MapPin className="mx-auto mb-2 size-5 opacity-40" />
      {text}
    </div>
  );
}
