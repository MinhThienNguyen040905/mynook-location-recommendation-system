'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  MapPin,
  MessageSquareText,
  Plus,
  RefreshCcw,
  Send,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  adminListCategories,
  adminListCities,
  adminListDistricts,
  createGoogleMapsDraft,
  enrichGoogleMapsDraft,
  getGoogleMapsDraft,
  listGoogleMapsDrafts,
  publishGoogleMapsDraft,
  rejectGoogleMapsDraft,
  resolveGoogleMapsImport,
  updateGoogleMapsDraft,
  type GoogleMapsImportDraft,
  type GoogleMapsImportNormalizedPayload,
  type GoogleMapsReviewSnippet,
} from '@/lib/api/admin';

type DraftForm = Partial<GoogleMapsImportNormalizedPayload>;

const STATUS_FILTERS: Array<{ value: GoogleMapsImportDraft['status'] | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Draft' },
  { value: 'enriched', label: 'Đã enrich' },
  { value: 'ready', label: 'Sẵn sàng' },
  { value: 'published', label: 'Đã publish' },
  { value: 'duplicate', label: 'Trùng lặp' },
  { value: 'rejected', label: 'Đã từ chối' },
];

export default function AdminImportsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<GoogleMapsImportDraft['status'] | 'all'>('all');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>({});
  const [pasteOpen, setPasteOpen] = useState(false);

  const draftsQuery = useQuery({
    queryKey: ['admin', 'imports', 'google-maps', statusFilter],
    queryFn: () => listGoogleMapsDrafts(statusFilter === 'all' ? undefined : statusFilter),
    refetchOnWindowFocus: false,
  });

  const draftDetailQuery = useQuery({
    queryKey: ['admin', 'imports', 'google-maps', 'detail', selectedDraftId],
    queryFn: () => getGoogleMapsDraft(selectedDraftId as string),
    enabled: Boolean(selectedDraftId),
    refetchOnWindowFocus: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminListCategories(),
    refetchOnWindowFocus: false,
  });

  const citiesQuery = useQuery({
    queryKey: ['admin', 'cities'],
    queryFn: () => adminListCities(),
    refetchOnWindowFocus: false,
  });

  const cityIdForDistricts =
    form.city_id ?? draftDetailQuery.data?.normalized_payload.city_id ?? '';
  const districtsQuery = useQuery({
    queryKey: ['admin', 'districts', cityIdForDistricts],
    queryFn: () => adminListDistricts(cityIdForDistricts || undefined),
    enabled: Boolean(cityIdForDistricts),
    refetchOnWindowFocus: false,
  });

  // Auto-select first draft on load
  useEffect(() => {
    if (!selectedDraftId && draftsQuery.data?.length) {
      setSelectedDraftId(draftsQuery.data[0].id);
    }
  }, [draftsQuery.data, selectedDraftId]);

  // Sync form when draft detail loads
  useEffect(() => {
    const detail = draftDetailQuery.data;
    if (!detail) return;
    setForm(detail.normalized_payload);
  }, [draftDetailQuery.data?.id]);

  const drafts = draftsQuery.data ?? [];
  const selectedDraft = draftDetailQuery.data ?? drafts.find((d) => d.id === selectedDraftId) ?? null;
  const categories = categoriesQuery.data ?? [];
  const cities = citiesQuery.data ?? [];
  const districts = districtsQuery.data ?? [];
  const currentCategoryIds = form.category_ids ?? [];
  const currentReviews = form.selected_reviews ?? [];
  const currentMedia = form.media ?? [];
  const isPublished = selectedDraft?.status === 'published';
  const isRejected = selectedDraft?.status === 'rejected';
  const isReadOnly = isPublished || isRejected;

  const saveMutation = useMutation({
    mutationFn: () => updateGoogleMapsDraft(selectedDraftId as string, form),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      setForm(data.normalized_payload);
      toast.success('Đã lưu draft');
    },
    onError: () => toast.error('Lưu draft thất bại'),
  });

  const enrichMutation = useMutation({
    mutationFn: () => enrichGoogleMapsDraft(selectedDraftId as string),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      setForm(data.normalized_payload);
      toast.success('Đã chạy enrichment');
    },
    onError: () => toast.error('Enrich thất bại'),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await updateGoogleMapsDraft(selectedDraftId as string, form);
      return publishGoogleMapsDraft(selectedDraftId as string);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      toast.success(`Đã publish — ${data.seeded_reviews} review được seed`);
    },
    onError: (err: Error) => toast.error(err.message || 'Publish thất bại'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectGoogleMapsDraft(selectedDraftId as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      toast.success('Đã từ chối draft');
    },
    onError: () => toast.error('Reject thất bại'),
  });

  const isBusy =
    saveMutation.isPending ||
    enrichMutation.isPending ||
    publishMutation.isPending ||
    rejectMutation.isPending;

  function setField<K extends keyof GoogleMapsImportNormalizedPayload>(
    key: K,
    value: GoogleMapsImportNormalizedPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(id: string) {
    const next = new Set(currentCategoryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const ids = Array.from(next);
    setForm((prev) => ({
      ...prev,
      category_ids: ids,
      primary_category_id:
        prev.primary_category_id && next.has(prev.primary_category_id)
          ? prev.primary_category_id
          : ids[0] ?? null,
    }));
  }

  function removeMedia(index: number) {
    const next = currentMedia.filter((_, i) => i !== index);
    setField('media', next);
  }

  function removeReview(index: number) {
    const next = currentReviews.filter((_, i) => i !== index);
    setField('selected_reviews', next);
  }

  function removeReviewMedia(reviewIndex: number, mediaIndex: number) {
    const next = currentReviews.map((r, i) => {
      if (i !== reviewIndex) return r;
      return {
        ...r,
        media: (r.media ?? []).filter((_, mi) => mi !== mediaIndex),
      };
    });
    setField('selected_reviews', next);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Google Maps Imports
            </h1>
            <p className="max-w-2xl text-sm text-slate-500">
              Drafts được tạo từ Tampermonkey userscript hoặc paste URL trực tiếp. Xem lại data,
              sửa nếu cần, rồi publish vào hệ thống.
            </p>
          </div>
          <PasteUrlDialog
            open={pasteOpen}
            onOpenChange={setPasteOpen}
            onCreated={(draftId) => {
              qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
              setSelectedDraftId(draftId);
            }}
          />
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Sidebar: drafts list */}
          <aside className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Lọc theo trạng thái
                </span>
                {draftsQuery.isFetching && <Loader2 className="size-3 animate-spin text-slate-400" />}
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <div className="space-y-2">
              {drafts.length === 0 ? (
                <Card className="border-dashed p-6 text-center text-xs text-slate-400">
                  Chưa có draft nào.
                  <br />
                  Dùng userscript hoặc paste URL để tạo.
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
                        'w-full rounded-xl border bg-white px-4 py-3 text-left transition-all',
                        active
                          ? 'border-slate-900 shadow-sm ring-1 ring-slate-900'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium text-slate-900">
                          {draft.normalized_payload?.name || 'Untitled'}
                        </p>
                        <StatusPill status={draft.status} compact />
                      </div>
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {draft.normalized_payload?.address_line || draft.source_url || '—'}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                          {Math.round((draft.confidence || 0) * 100)}%
                        </span>
                        <span>{(draft.normalized_payload?.media?.length ?? 0)} ảnh</span>
                        <span>·</span>
                        <span>
                          {(draft.normalized_payload?.selected_reviews?.length ?? 0)} reviews
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Main: draft detail */}
          <main className="space-y-4">
            {!selectedDraft ? (
              <Card className="flex h-96 items-center justify-center text-sm text-slate-400">
                Chọn 1 draft bên trái để xem chi tiết.
              </Card>
            ) : (
              <>
                {/* Action bar */}
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">
                          {form.name || selectedDraft.normalized_payload.name || 'Untitled'}
                        </h2>
                        <StatusPill status={selectedDraft.status} />
                        {selectedDraft.matched_venue_id && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="size-3" />
                            Trùng venue
                          </Badge>
                        )}
                      </div>
                      {selectedDraft.source_url && (
                        <a
                          href={selectedDraft.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
                        >
                          <Link2 className="size-3" />
                          Mở trên Google Maps
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isReadOnly && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => enrichMutation.mutate()}
                            disabled={isBusy}
                          >
                            {enrichMutation.isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RefreshCcw className="size-4" />
                            )}
                            Enrich
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectMutation.mutate()}
                            disabled={isBusy}
                          >
                            <Trash2 className="size-4" />
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => saveMutation.mutate()}
                            disabled={isBusy}
                          >
                            {saveMutation.isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            Lưu nháp
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => publishMutation.mutate()}
                            disabled={isBusy}
                          >
                            {publishMutation.isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Send className="size-4" />
                            )}
                            Publish
                          </Button>
                        </>
                      )}
                      {isPublished && selectedDraft.published_venue_id && (
                        <Button asChild size="sm" variant="outline">
                          <a href={`/venues/${selectedDraft.published_venue_id}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-4" />
                            Xem venue
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Duplicate warning */}
                {selectedDraft.matched_venue_id && (
                  <Card className="border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-amber-900">
                          Có thể trùng venue đã tồn tại (confidence {Math.round((selectedDraft.confidence || 0) * 100)}%)
                        </p>
                        <p className="text-amber-700">
                          Venue match: <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">{selectedDraft.matched_venue_id}</code>.
                          Cân nhắc Reject draft này thay vì Publish để tránh tạo bản sao.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Section: Basic info */}
                <Section icon={<Info className="size-4" />} title="Thông tin cơ bản">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Tên venue" required>
                      <Input
                        value={form.name ?? ''}
                        onChange={(e) => setField('name', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </Field>
                    <Field label="Chi nhánh">
                      <Input
                        value={form.branch_name ?? ''}
                        onChange={(e) => setField('branch_name', e.target.value || null)}
                        disabled={isReadOnly}
                      />
                    </Field>
                  </div>
                  <Field label="Mô tả">
                    <Textarea
                      value={form.description ?? ''}
                      onChange={(e) => setField('description', e.target.value || null)}
                      placeholder="Tự sinh từ name + address nếu để trống"
                      rows={3}
                      disabled={isReadOnly}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Website">
                      <Input
                        value={form.website ?? ''}
                        onChange={(e) => setField('website', e.target.value || null)}
                        disabled={isReadOnly}
                      />
                    </Field>
                    <Field label="Số điện thoại">
                      <Input
                        value={form.phone_number ?? ''}
                        onChange={(e) => setField('phone_number', e.target.value || null)}
                        disabled={isReadOnly}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Rating từ Google">
                      <Input
                        type="number"
                        step="0.1"
                        value={numField(form.rating_avg)}
                        onChange={(e) => setField('rating_avg', parseNullableNumber(e.target.value))}
                        disabled={isReadOnly}
                      />
                    </Field>
                    <Field label="Số review từ Google">
                      <Input
                        type="number"
                        value={numField(form.review_count)}
                        onChange={(e) => setField('review_count', parseNullableNumber(e.target.value))}
                        disabled={isReadOnly}
                      />
                    </Field>
                  </div>
                </Section>

                {/* Section: Location */}
                <Section icon={<MapPin className="size-4" />} title="Vị trí">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Địa chỉ" className="md:col-span-2">
                          <Input
                            value={form.address_line ?? ''}
                            onChange={(e) => setField('address_line', e.target.value || null)}
                            disabled={isReadOnly}
                          />
                        </Field>
                        <Field label="Phường / xã">
                          <Input
                            value={form.ward ?? ''}
                            onChange={(e) => setField('ward', e.target.value || null)}
                            disabled={isReadOnly}
                          />
                        </Field>
                        <Field label="Thành phố">
                          <Select
                            value={form.city_id || undefined}
                            onValueChange={(v) =>
                              setForm((prev) => ({ ...prev, city_id: v, district_id: null }))
                            }
                            disabled={isReadOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn city" />
                            </SelectTrigger>
                            <SelectContent>
                              {cities.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Quận / huyện">
                          <Select
                            value={form.district_id || undefined}
                            onValueChange={(v) => setField('district_id', v)}
                            disabled={isReadOnly || !form.city_id}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn district" />
                            </SelectTrigger>
                            <SelectContent>
                              {districts.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Latitude">
                          <Input
                            type="number"
                            step="any"
                            value={numField(form.latitude)}
                            onChange={(e) => setField('latitude', parseNullableNumber(e.target.value))}
                            disabled={isReadOnly}
                          />
                        </Field>
                        <Field label="Longitude">
                          <Input
                            type="number"
                            step="any"
                            value={numField(form.longitude)}
                            onChange={(e) => setField('longitude', parseNullableNumber(e.target.value))}
                            disabled={isReadOnly}
                          />
                        </Field>
                      </div>
                    </div>

                    <MapPreview latitude={form.latitude} longitude={form.longitude} />
                  </div>
                </Section>

                {/* Section: Categories */}
                <Section
                  icon={<Tag className="size-4" />}
                  title="Phân loại"
                  hint={`${currentCategoryIds.length} đã chọn · click để toggle`}
                >
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const active = currentCategoryIds.includes(category.id);
                      const isPrimary = form.primary_category_id === category.id;
                      return (
                        <div key={category.id} className="flex items-center">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => toggleCategory(category.id)}
                            className={cn(
                              'rounded-l-full border border-r-0 px-3 py-1.5 text-xs font-medium transition-colors',
                              active
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                              isReadOnly && 'cursor-not-allowed opacity-60',
                            )}
                          >
                            {category.display_name}
                          </button>
                          <button
                            type="button"
                            disabled={isReadOnly || !active}
                            title="Đặt làm primary"
                            onClick={() => setField('primary_category_id', category.id)}
                            className={cn(
                              'rounded-r-full border border-l-0 px-2 py-1.5 transition-colors',
                              active
                                ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                                : 'border-slate-200 bg-white text-slate-300',
                              isReadOnly && 'cursor-not-allowed opacity-60',
                            )}
                          >
                            <Star
                              className={cn(
                                'size-3.5',
                                isPrimary && 'fill-amber-300 text-amber-300',
                              )}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {currentCategoryIds.length > 0 && form.primary_category_id && (
                    <p className="mt-3 text-xs text-slate-500">
                      Primary:{' '}
                      <span className="font-semibold text-slate-700">
                        {categories.find((c) => c.id === form.primary_category_id)?.display_name ?? '—'}
                      </span>
                    </p>
                  )}
                </Section>

                {/* Section: Venue media */}
                <Section
                  icon={<ImageIcon className="size-4" />}
                  title="Ảnh venue"
                  hint={`${currentMedia.length} ảnh đã import`}
                >
                  {currentMedia.length === 0 ? (
                    <EmptyHint text="Chưa có ảnh venue. Userscript có thể chưa extract được — chạy 🔍 Test trong panel Tampermonkey để check, hoặc paste URL bên dưới." />
                  ) : (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                      {currentMedia.map((url, i) => (
                        <MediaTile
                          key={`${url}-${i}`}
                          url={url}
                          onRemove={isReadOnly ? undefined : () => removeMedia(i)}
                        />
                      ))}
                    </div>
                  )}
                  {!isReadOnly && (
                    <UrlAdderInput
                      placeholder="Paste URL ảnh để thêm thủ công (Cloudinary hoặc bất kỳ HTTPS URL)…"
                      onAdd={(url) => setField('media', [...currentMedia, url])}
                    />
                  )}
                </Section>

                {/* Section: Menu image */}
                <Section
                  icon={<ImageIcon className="size-4" />}
                  title="Ảnh menu"
                  hint={form.menu_image_url ? '1 ảnh' : 'chưa có'}
                >
                  {form.menu_image_url ? (
                    <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
                      <MenuImagePreview
                        url={form.menu_image_url}
                        onRemove={isReadOnly ? undefined : () => setField('menu_image_url', null)}
                      />
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-600">URL ảnh menu</Label>
                        <Input
                          value={form.menu_image_url}
                          onChange={(e) => setField('menu_image_url', e.target.value || null)}
                          disabled={isReadOnly}
                        />
                        <p className="text-xs text-slate-400">
                          Sửa URL nếu cần đổi sang ảnh khác. Bấm X trên ảnh để xóa.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <EmptyHint text="Chưa có ảnh menu. Google Maps thường tag photos category 'Menu' / 'Thực đơn' — userscript sẽ tự lấy nếu place có tag đó. Nếu không có, paste URL ảnh menu thủ công bên dưới." />
                      {!isReadOnly && (
                        <UrlAdderInput
                          placeholder="Paste URL ảnh menu…"
                          onAdd={(url) => setField('menu_image_url', url)}
                        />
                      )}
                    </>
                  )}
                </Section>

                {/* Section: Reviews */}
                <Section
                  icon={<MessageSquareText className="size-4" />}
                  title="Reviews đã import"
                  hint={`${currentReviews.length} review · publish sẽ seed vào DB với random user`}
                >
                  {currentReviews.length === 0 ? (
                    <EmptyHint text="Không có review nào — venue mới sẽ thiếu cold-start tags từ Groq review analysis." />
                  ) : (
                    <div className="space-y-3">
                      {currentReviews.map((review, i) => (
                        <ReviewSnippetCard
                          key={`${review.source_review_id ?? ''}-${i}`}
                          review={review}
                          readOnly={isReadOnly}
                          onRemove={() => removeReview(i)}
                          onRemoveMedia={(mi) => removeReviewMedia(i, mi)}
                        />
                      ))}
                    </div>
                  )}
                </Section>

                {/* Section: Source metadata */}
                <Section icon={<Clock className="size-4" />} title="Metadata">
                  <dl className="grid gap-3 text-xs sm:grid-cols-2">
                    <Meta label="Source" value={selectedDraft.source} />
                    <Meta label="Place ID" value={selectedDraft.source_place_id || '—'} mono />
                    <Meta label="Confidence" value={`${Math.round((selectedDraft.confidence || 0) * 100)}%`} />
                    <Meta label="Tạo lúc" value={new Date(selectedDraft.created_at).toLocaleString('vi-VN')} />
                    <Meta label="Cập nhật" value={new Date(selectedDraft.updated_at).toLocaleString('vi-VN')} />
                    {selectedDraft.published_venue_id && (
                      <Meta label="Venue ID" value={selectedDraft.published_venue_id} mono />
                    )}
                  </dl>
                </Section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ===== Subcomponents =====================================================

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function StatusPill({
  status,
  compact,
}: {
  status: GoogleMapsImportDraft['status'];
  compact?: boolean;
}) {
  const map: Record<GoogleMapsImportDraft['status'], { label: string; className: string; icon?: ReactNode }> = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
    enriched: { label: 'Enriched', className: 'bg-blue-50 text-blue-700' },
    ready: { label: 'Sẵn sàng', className: 'bg-green-50 text-green-700' },
    published: {
      label: 'Đã publish',
      className: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle2 className="size-3" />,
    },
    duplicate: {
      label: 'Trùng',
      className: 'bg-amber-100 text-amber-700',
      icon: <AlertTriangle className="size-3" />,
    },
    rejected: { label: 'Đã từ chối', className: 'bg-red-50 text-red-700' },
  };
  const m = map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        m.className,
        compact && 'shrink-0',
      )}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

function MediaTile({ url, onRemove }: { url: string; onRemove?: () => void }) {
  const [errored, setErrored] = useState(false);
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      {errored ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-[10px] text-red-500 hover:bg-red-50"
          title={url}
        >
          <ImageIcon className="size-5" />
          <span>Ảnh hỏng</span>
          <span className="break-all opacity-60">{url.slice(-30)}</span>
        </a>
      ) : (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
          title="Xóa ảnh"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function MenuImagePreview({ url, onRemove }: { url: string; onRemove?: () => void }) {
  const [errored, setErrored] = useState(false);
  return (
    <div className="group relative aspect-4/3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      {errored ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-red-500 hover:bg-red-50"
          title={url}
        >
          <ImageIcon className="size-8" />
          <span className="font-medium">Ảnh hỏng — click để mở URL</span>
          <span className="break-all opacity-60">{url.slice(-50)}</span>
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" title="Mở ảnh đầy đủ">
          <img
            src={url}
            alt="Menu"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            onError={() => setErrored(true)}
          />
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
          title="Xóa ảnh menu"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function ReviewSnippetCard({
  review,
  readOnly,
  onRemove,
  onRemoveMedia,
}: {
  review: GoogleMapsReviewSnippet;
  readOnly: boolean;
  onRemove: () => void;
  onRemoveMedia: (mediaIndex: number) => void;
}) {
  const stars = Math.max(1, Math.min(5, Math.round(review.rating)));
  const media = review.media ?? [];
  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'size-4',
                    i < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200',
                  )}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-slate-900">
              {review.author_name || 'Ẩn danh'}
            </span>
            {review.published_at && (
              <span className="text-xs text-slate-400">· {review.published_at}</span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{review.content}</p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            title="Xóa review"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {media.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {media.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group/img relative size-16 overflow-hidden rounded-md border border-slate-200"
            >
              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemoveMedia(i)}
                  className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover/img:opacity-100"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MapPreview({
  latitude,
  longitude,
}: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}) {
  const src = useMemo(() => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return `https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
  }, [latitude, longitude]);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-600">Map preview</Label>
      {src ? (
        <iframe
          title="map preview"
          src={src}
          className="h-56 w-full rounded-lg border border-slate-200"
          loading="lazy"
        />
      ) : (
        <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
          Chưa có tọa độ
        </div>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
      {text}
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-slate-100 pb-2 last:border-none last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={cn(
          'max-w-[60%] truncate text-right text-slate-800',
          mono && 'font-mono text-[11px]',
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function UrlAdderInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (url: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            onAdd(value.trim());
            setValue('');
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!value.trim()}
        onClick={() => {
          onAdd(value.trim());
          setValue('');
        }}
      >
        <Plus className="size-4" />
        Thêm
      </Button>
    </div>
  );
}

function PasteUrlDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (draftId: string) => void;
}) {
  const [input, setInput] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handlePreview() {
    if (!input.trim()) return;
    setPreviewing(true);
    try {
      const result = await resolveGoogleMapsImport({
        input: input.trim(),
        source_url: input.trim(),
      });
      toast.success(
        `Preview: ${result.name}${result.matched_venue_id ? ' (cảnh báo trùng)' : ''}`,
      );
    } catch {
      toast.error('Không phân tích được nguồn');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCreate() {
    if (!input.trim()) return;
    setCreating(true);
    try {
      const draft = await createGoogleMapsDraft({
        input: input.trim(),
        source_url: input.trim(),
      });
      toast.success('Đã tạo draft');
      onCreated(draft.id);
      onOpenChange(false);
      setInput('');
    } catch {
      toast.error('Tạo draft thất bại');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Paste URL
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo draft từ URL Google Maps</DialogTitle>
          <DialogDescription>
            Cách nhanh nhất là dùng userscript Tampermonkey. Nếu cần tạo nhanh chỉ với URL,
            paste vào đây — backend sẽ parse lat/lng + tên, các trường khác sẽ rỗng và bạn
            tự sửa trong form.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://www.google.com/maps/place/..."
          rows={4}
          className="font-mono text-xs"
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!input.trim() || previewing}
          >
            {previewing && <Loader2 className="size-4 animate-spin" />}
            Preview
          </Button>
          <Button onClick={handleCreate} disabled={!input.trim() || creating}>
            {creating && <Loader2 className="size-4 animate-spin" />}
            Tạo draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Helpers ===========================================================

function parseNullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numField(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return String(value);
}
