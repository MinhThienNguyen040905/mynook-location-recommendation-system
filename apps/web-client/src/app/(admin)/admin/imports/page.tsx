'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Loader2,
  MapPin,
  MessageSquareText,
  RefreshCcw,
  Save,
  Send,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  selectGoogleMapsDraftReviews,
  updateGoogleMapsDraft,
  type GoogleMapsImportDraft,
  type GoogleMapsImportNormalizedPayload,
  type GoogleMapsReviewSnippet,
} from '@/lib/api/admin';

type DraftForm = Partial<GoogleMapsImportNormalizedPayload> & {
  input?: string | null;
  source_url?: string | null;
  source_place_id?: string | null;
};

const EMPTY_FORM: DraftForm = {
  name: '',
  branch_name: '',
  description: '',
  address_line: '',
  ward: '',
  city_id: '',
  district_id: '',
  latitude: null,
  longitude: null,
  website: '',
  phone_number: '',
  opening_hours: null,
  media: [],
  menu_image_url: '',
  rating_avg: null,
  review_count: null,
  category_ids: [],
  primary_category_id: '',
  selected_reviews: [],
};

export default function AdminImportsPage() {
  const qc = useQueryClient();
  const [sourceInput, setSourceInput] = useState('');
  const [preview, setPreview] = useState<GoogleMapsImportDraft | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [reviewText, setReviewText] = useState('');

  const draftsQuery = useQuery({
    queryKey: ['admin', 'imports', 'google-maps'],
    queryFn: () => listGoogleMapsDrafts(),
    refetchOnWindowFocus: false,
  });

  const draftDetailQuery = useQuery({
    queryKey: ['admin', 'imports', 'google-maps', selectedDraftId],
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

  const districtsQuery = useQuery({
    queryKey: ['admin', 'districts', form.city_id ?? draftDetailQuery.data?.normalized_payload.city_id ?? ''],
    queryFn: () => adminListDistricts((form.city_id ?? draftDetailQuery.data?.normalized_payload.city_id ?? '') || undefined),
    enabled: Boolean(form.city_id ?? draftDetailQuery.data?.normalized_payload.city_id),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!selectedDraftId && draftsQuery.data?.length) {
      setSelectedDraftId(draftsQuery.data[0].id);
    }
  }, [draftsQuery.data, selectedDraftId]);

  useEffect(() => {
    const detail = draftDetailQuery.data;
    if (!detail) return;
    setForm({
      ...EMPTY_FORM,
      ...detail.normalized_payload,
      input: detail.raw_payload?.input as string | undefined,
      source_url: detail.source_url ?? undefined,
      source_place_id: detail.source_place_id ?? undefined,
    });
    setReviewText(reviewsToText(detail.normalized_payload.selected_reviews ?? []));
  }, [draftDetailQuery.data?.id]);

  const previewMutation = useMutation({
    mutationFn: () =>
      resolveGoogleMapsImport({
        input: sourceInput.trim(),
        source_url: sourceInput.trim(),
      }),
    onSuccess: (data) => {
      setPreview({
        id: 'preview',
        source: data.source,
        source_place_id: data.source_place_id,
        source_url: data.source_url,
        raw_payload: {},
        normalized_payload: {
          ...data,
          selected_reviews: [],
        } as GoogleMapsImportNormalizedPayload,
        status: 'draft',
        matched_venue_id: data.matched_venue_id,
        published_venue_id: null,
        confidence: data.confidence,
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setForm((prev) => ({
        ...prev,
        ...data,
        selected_reviews: prev.selected_reviews ?? [],
      }));
      toast.success('Đã phân tích nguồn nhập');
    },
    onError: () => toast.error('Không phân tích được nguồn nhập'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createGoogleMapsDraft({
        input: sourceInput.trim(),
        source_url: sourceInput.trim(),
        normalized_payload: {
          ...form,
          selected_reviews: parseReviewText(reviewText),
        } as Partial<GoogleMapsImportNormalizedPayload>,
        reviews: parseReviewText(reviewText),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      setSelectedDraftId(data.id);
      setForm({
        ...EMPTY_FORM,
        ...data.normalized_payload,
      });
      setReviewText(reviewsToText(data.normalized_payload.selected_reviews ?? []));
      toast.success('Đã tạo draft import');
    },
    onError: () => toast.error('Tạo draft thất bại'),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateGoogleMapsDraft(selectedDraftId as string, {
        ...form,
        selected_reviews: parseReviewText(reviewText),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps', data.id] });
      setForm({
        ...EMPTY_FORM,
        ...data.normalized_payload,
      });
      setReviewText(reviewsToText(data.normalized_payload.selected_reviews ?? []));
      toast.success('Đã lưu draft');
    },
    onError: () => toast.error('Lưu draft thất bại'),
  });

  const enrichMutation = useMutation({
    mutationFn: () => enrichGoogleMapsDraft(selectedDraftId as string),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps', data.id] });
      setSelectedDraftId(data.id);
      setForm({
        ...EMPTY_FORM,
        ...data.normalized_payload,
      });
      toast.success('Đã làm giàu draft');
    },
    onError: () => toast.error('Enrich thất bại'),
  });

  const selectReviewsMutation = useMutation({
    mutationFn: () => selectGoogleMapsDraftReviews(selectedDraftId as string, parseReviewText(reviewText)),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps', data.id] });
      setForm({
        ...EMPTY_FORM,
        ...data.normalized_payload,
      });
      setReviewText(reviewsToText(data.normalized_payload.selected_reviews ?? []));
      toast.success('Đã cập nhật review snippets');
    },
    onError: () => toast.error('Cập nhật review snippets thất bại'),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await updateGoogleMapsDraft(selectedDraftId as string, {
        ...form,
        selected_reviews: parseReviewText(reviewText),
      });
      return publishGoogleMapsDraft(selectedDraftId as string);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps', data.draft.id] });
      toast.success(`Đã publish venue với ${data.seeded_reviews} review seed`);
      setSelectedDraftId(data.draft.id);
      setForm({
        ...EMPTY_FORM,
        ...data.draft.normalized_payload,
      });
      setReviewText(reviewsToText(data.draft.normalized_payload.selected_reviews ?? []));
    },
    onError: () => toast.error('Publish thất bại'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectGoogleMapsDraft(selectedDraftId as string),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps'] });
      qc.invalidateQueries({ queryKey: ['admin', 'imports', 'google-maps', data.id] });
      toast.success('Đã từ chối draft');
    },
    onError: () => toast.error('Reject thất bại'),
  });

  const drafts = draftsQuery.data ?? [];
  const selectedDraft = draftDetailQuery.data ?? drafts.find((item) => item.id === selectedDraftId) ?? null;
  const selectedCityId = form.city_id || selectedDraft?.normalized_payload.city_id || '';
  const districts = districtsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const cities = citiesQuery.data ?? [];
  const currentCategoryIds = form.category_ids ?? [];

  const mapSrc = useMemo(() => {
    const lat = form.latitude ?? selectedDraft?.normalized_payload.latitude;
    const lng = form.longitude ?? selectedDraft?.normalized_payload.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  }, [form.latitude, form.longitude, selectedDraft?.normalized_payload.latitude, selectedDraft?.normalized_payload.longitude]);

  const isBusy =
    previewMutation.isPending ||
    createMutation.isPending ||
    saveMutation.isPending ||
    enrichMutation.isPending ||
    selectReviewsMutation.isPending ||
    publishMutation.isPending ||
    rejectMutation.isPending;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Google Maps Import</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          Dán nguồn Google Maps, chỉnh dữ liệu draft, chọn review snippets và publish vào pipeline venue hiện có.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Nguồn nhập</p>
                <p className="text-xs text-slate-500">URL, place id hoặc text đã copy từ Maps.</p>
              </div>
              <Badge variant="outline">{drafts.length} drafts</Badge>
            </div>
            <Textarea
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              className="mt-3 min-h-32"
              placeholder="https://www.google.com/maps/place/..."
            />
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => previewMutation.mutate()}
                disabled={!sourceInput.trim() || previewMutation.isPending}
              >
                {previewMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Xem trước
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => createMutation.mutate()}
                disabled={!sourceInput.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Tạo draft
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Drafts</p>
              {(draftsQuery.isFetching || draftDetailQuery.isFetching) && (
                <Loader2 className="size-4 animate-spin text-slate-400" />
              )}
            </div>
            <div className="mt-3 space-y-2">
              {drafts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                  Chưa có draft nào.
                </div>
              ) : (
                drafts.map((draft) => (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => setSelectedDraftId(draft.id)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                      selectedDraftId === draft.id
                        ? 'border-nook-olive bg-nook-olive/5'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-medium text-slate-900">
                        {draft.normalized_payload?.name || 'Untitled draft'}
                      </p>
                      <Badge variant={statusVariant(draft.status)}>{draft.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">{draft.source_place_id || draft.source_url || 'Google Maps'}</span>
                      <span>{Math.round((draft.confidence || 0) * 100)}%</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {preview && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Preview</p>
                <Badge variant={preview.matched_venue_id ? 'destructive' : 'outline'}>
                  {preview.matched_venue_id ? 'Duplicate' : 'Fresh'}
                </Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <Row label="Tên" value={preview.normalized_payload.name} />
                <Row label="Địa chỉ" value={formatAddress(preview.normalized_payload)} />
                <Row label="Confidence" value={`${Math.round((preview.confidence || 0) * 100)}%`} />
                <Row label="Match" value={preview.matched_venue_id || 'none'} />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedDraft?.normalized_payload?.name || 'Draft detail'}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedDraft ? `Status: ${selectedDraft.status}` : 'Chọn một draft để chỉnh sửa.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => enrichMutation.mutate()} disabled={!selectedDraftId || isBusy}>
                  <RefreshCcw className="size-4" />
                  Enrich
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectReviewsMutation.mutate()} disabled={!selectedDraftId || isBusy}>
                  <MessageSquareText className="size-4" />
                  Reviews
                </Button>
                <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={!selectedDraftId || isBusy}>
                  <Save className="size-4" />
                  Lưu
                </Button>
                <Button size="sm" onClick={() => publishMutation.mutate()} disabled={!selectedDraftId || isBusy}>
                  <Send className="size-4" />
                  Publish
                </Button>
                <Button variant="destructive" size="sm" onClick={() => rejectMutation.mutate()} disabled={!selectedDraftId || isBusy}>
                  <Trash2 className="size-4" />
                  Reject
                </Button>
              </div>
            </div>

            {!selectedDraft ? (
              <div className="px-5 py-10 text-sm text-slate-500">
                Chọn draft bên trái để chỉnh sửa.
              </div>
            ) : (
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5 px-5 py-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Tên">
                      <Input value={form.name ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </Field>
                    <Field label="Chi nhánh">
                      <Input value={form.branch_name ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, branch_name: e.target.value }))} />
                    </Field>
                  </div>

                  <Field label="Mô tả">
                    <Textarea
                      value={form.description ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="min-h-28"
                    />
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Địa chỉ">
                      <Input value={form.address_line ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, address_line: e.target.value }))} />
                    </Field>
                    <Field label="Phường / xã">
                      <Input value={form.ward ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, ward: e.target.value }))} />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Thành phố">
                      <Select
                        value={selectedCityId || undefined}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, city_id: value, district_id: '' }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn city" />
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
                    <Field label="Quận / huyện">
                      <Select
                        value={form.district_id || undefined}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, district_id: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn district" />
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
                    <Field label="Nguồn">
                      <Input value={selectedDraft.source_place_id || selectedDraft.source_url || 'google_maps'} readOnly />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Latitude">
                      <Input
                        type="number"
                        value={numberField(form.latitude)}
                        onChange={(e) => setForm((prev) => ({ ...prev, latitude: parseNullableNumber(e.target.value) }))}
                      />
                    </Field>
                    <Field label="Longitude">
                      <Input
                        type="number"
                        value={numberField(form.longitude)}
                        onChange={(e) => setForm((prev) => ({ ...prev, longitude: parseNullableNumber(e.target.value) }))}
                      />
                    </Field>
                    <Field label="Rating avg">
                      <Input
                        type="number"
                        value={numberField(form.rating_avg)}
                        onChange={(e) => setForm((prev) => ({ ...prev, rating_avg: parseNullableNumber(e.target.value) }))}
                      />
                    </Field>
                    <Field label="Review count">
                      <Input
                        type="number"
                        value={numberField(form.review_count)}
                        onChange={(e) => setForm((prev) => ({ ...prev, review_count: parseNullableNumber(e.target.value) }))}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Website">
                      <Input value={form.website ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} />
                    </Field>
                    <Field label="Phone">
                      <Input value={form.phone_number ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))} />
                    </Field>
                  </div>

                  <Field label="Ảnh menu">
                    <Input value={form.menu_image_url ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, menu_image_url: e.target.value }))} />
                  </Field>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-slate-900">Categories</Label>
                      <span className="text-xs text-slate-400">
                        {currentCategoryIds.length} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => {
                        const active = currentCategoryIds.includes(category.id);
                        const primary = form.primary_category_id === category.id;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                const ids = new Set(prev.category_ids ?? []);
                                if (ids.has(category.id)) ids.delete(category.id);
                                else ids.add(category.id);
                                return {
                                  ...prev,
                                  category_ids: Array.from(ids),
                                  primary_category_id:
                                    primary ? Array.from(ids)[0] ?? '' : prev.primary_category_id || category.id,
                                };
                              })
                            }
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                              active
                                ? 'border-nook-olive bg-nook-olive/10 text-nook-olive'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                            )}
                          >
                            {category.display_name}
                            {primary && <span className="ml-1 text-[10px] uppercase">primary</span>}
                          </button>
                        );
                      })}
                    </div>
                    <Field label="Primary category">
                      <Select
                        value={form.primary_category_id || undefined}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, primary_category_id: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn primary" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((category) => currentCategoryIds.includes(category.id))
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.display_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Review snippets">
                    <Textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="min-h-40"
                      placeholder="5|Minh|Không gian yên tĩnh, phù hợp làm việc"
                    />
                  </Field>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedDraft.status}</Badge>
                    <Badge variant={selectedDraft.matched_venue_id ? 'destructive' : 'secondary'}>
                      {selectedDraft.matched_venue_id ? 'Duplicate warning' : 'No duplicate'}
                    </Badge>
                    <Badge variant="outline">{Math.round((selectedDraft.confidence || 0) * 100)}%</Badge>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/60 p-5 lg:border-l lg:border-t-0">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <MapPin className="size-4" />
                        Map preview
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatAddress(form) || 'Thiếu tọa độ'}
                      </p>
                      {mapSrc ? (
                        <iframe
                          title="map preview"
                          src={mapSrc}
                          className="mt-3 h-56 w-full rounded-lg border border-slate-200"
                          loading="lazy"
                        />
                      ) : (
                        <div className="mt-3 flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                          Chưa có tọa độ
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Star className="size-4" />
                        Review preview
                      </div>
                      <div className="mt-3 space-y-2">
                        {parseReviewText(reviewText).length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-400">
                            Chưa có review snippets.
                          </div>
                        ) : (
                          parseReviewText(reviewText).map((review, index) => (
                            <div
                              key={`${review.content}-${index}`}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-900">
                                  {review.rating}/5 {review.author_name ? `· ${review.author_name}` : ''}
                                </span>
                                <Badge variant="outline" className="rounded-full">
                                  seed
                                </Badge>
                              </div>
                              <p className="mt-1 leading-relaxed">{review.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <AlertTriangle className="size-4 text-amber-500" />
                        Duplicate trace
                      </div>
                      <p className="mt-2">
                        {selectedDraft.matched_venue_id
                          ? `Draft này gần như trùng venue ${selectedDraft.matched_venue_id}.`
                          : 'Chưa thấy trùng rõ ràng.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="max-w-[70%] text-right text-sm text-slate-800">{value || '—'}</span>
    </div>
  );
}

function statusVariant(status: GoogleMapsImportDraft['status']) {
  switch (status) {
    case 'published':
      return 'default';
    case 'duplicate':
      return 'destructive';
    case 'rejected':
      return 'secondary';
    default:
      return 'outline';
  }
}

function parseNullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberField(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return String(value);
}

function parseReviewText(text: string): GoogleMapsReviewSnippet[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
      const rating = Number(parts[0]);
      if (!Number.isFinite(rating)) {
        return {
          rating: 5,
          content: line,
          author_name: null,
          source_review_id: null,
          published_at: null,
        } as GoogleMapsReviewSnippet;
      }
      if (parts.length >= 3) {
        return {
          rating: Math.max(1, Math.min(5, rating)),
          author_name: parts[1] || null,
          content: parts.slice(2).join(' | '),
          source_review_id: null,
          published_at: null,
        } as GoogleMapsReviewSnippet;
      }
      return {
        rating: Math.max(1, Math.min(5, rating)),
        author_name: null,
        content: parts.slice(1).join(' | ') || line,
        source_review_id: null,
        published_at: null,
      } as GoogleMapsReviewSnippet;
    });
}

function reviewsToText(reviews: GoogleMapsReviewSnippet[]): string {
  return reviews
    .map((review) =>
      review.author_name
        ? `${review.rating}|${review.author_name}|${review.content}`
        : `${review.rating}|${review.content}`,
    )
    .join('\n');
}

function formatAddress(payload: Partial<GoogleMapsImportNormalizedPayload>): string {
  return [payload.address_line, payload.ward].filter(Boolean).join(', ');
}
