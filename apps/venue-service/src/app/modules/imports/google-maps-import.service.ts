import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import {
  District,
  Venue,
  VenueImport,
  VenueImportReviewSource,
  VenueImportStatus,
} from '@mynook/database';
import { INTERACTION_SERVICE_URL } from '@mynook/shared-types';
import { CategoryService } from '../category/category.service.js';
import { LocationService } from '../location/location.service.js';
import { VenueService } from '../venue/venue.service.js';

interface GoogleMapsReviewSnippet {
  source_review_id?: string | null;
  author_name?: string | null;
  rating: number;
  content: string;
  published_at?: string | null;
  media?: string[];
}

interface GoogleMapsNormalizedPayload {
  name: string;
  branch_name: string | null;
  description: string | null;
  address_line: string | null;
  ward: string | null;
  city_id: string | null;
  district_id: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone_number: string | null;
  opening_hours: unknown | null;
  media: string[];
  menu_image_url: string | null;
  rating_avg: number | null;
  review_count: number | null;
  category_ids: string[];
  primary_category_id: string | null;
  selected_reviews: GoogleMapsReviewSnippet[];
}

interface GoogleMapsResolvedPayload extends GoogleMapsNormalizedPayload {
  source: 'google_maps';
  source_place_id: string | null;
  source_url: string | null;
  input: string;
  confidence: number;
  matched_venue_id: string | null;
  duplicate_reason: string | null;
}

interface GoogleMapsImportInput {
  input?: string;
  source_url?: string;
  source_place_id?: string;
  name?: string;
  branch_name?: string;
  description?: string;
  address_line?: string;
  ward?: string;
  city_id?: string;
  district_id?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone_number?: string;
  opening_hours?: unknown;
  media?: unknown;
  menu_image_url?: string;
  rating_avg?: number;
  review_count?: number;
  reviews?: GoogleMapsReviewSnippet[];
  category_ids?: string[];
  primary_category_id?: string;
  raw_payload?: Record<string, unknown>;
  normalized_payload?: Partial<GoogleMapsNormalizedPayload>;
}

interface PublishReviewSeedResult {
  review_id: string;
  account_id: string;
  source_review_id: string | null;
}

@Injectable()
export class GoogleMapsImportService {
  private readonly logger = new Logger(GoogleMapsImportService.name);

  constructor(
    @InjectRepository(VenueImport)
    private readonly importRepo: Repository<VenueImport>,
    @InjectRepository(VenueImportReviewSource)
    private readonly sourceRepo: Repository<VenueImportReviewSource>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly categoryService: CategoryService,
    private readonly locationService: LocationService,
    private readonly venueService: VenueService,
    private readonly dataSource: DataSource,
    private readonly http: HttpService,
  ) {}

  async listDrafts(status?: VenueImportStatus | 'all') {
    const where =
      status && status !== 'all' ? { status } : {};
    const drafts = await this.importRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
    return Promise.all(drafts.map((draft) => this.serializeDraft(draft)));
  }

  async getDraft(id: string) {
    const draft = await this.importRepo.findOne({ where: { id } });
    if (!draft) throw new NotFoundException('Import draft not found');
    return this.serializeDraft(draft);
  }

  async resolve(input: GoogleMapsImportInput): Promise<GoogleMapsResolvedPayload> {
    const rawText = this.pickInput(input);
    const sourceUrl = this.pickString(input.source_url) ?? this.extractUrl(rawText);
    const sourcePlaceId =
      this.pickString(input.source_place_id) ??
      this.extractPlaceId(sourceUrl) ??
      this.extractPlaceId(rawText);

    const urlData = sourceUrl ? this.parseGoogleMapsUrl(sourceUrl) : {};
    const textData = this.parseFreeText(rawText);
    const name =
      this.pickString(input.name) ??
      this.pickString(urlData.name) ??
      this.pickString(textData.name) ??
      sourcePlaceId ??
      'Google Maps place';
    const branchName = this.pickString(input.branch_name) ?? null;
    const addressLine =
      this.pickString(input.address_line) ??
      this.pickString(urlData.address) ??
      this.pickString(textData.address) ??
      null;
    const ward = this.pickString(input.ward) ?? null;
    const latitude = this.pickNumber(input.latitude) ?? this.pickNumber(urlData.latitude);
    const longitude = this.pickNumber(input.longitude) ?? this.pickNumber(urlData.longitude);

    const location = await this.resolveLocation({
      input: rawText,
      name,
      addressLine,
      ward,
      latitude,
      longitude,
      cityId: this.pickString(input.city_id) ?? null,
      districtId: this.pickString(input.district_id) ?? null,
    });

    const categories = await this.suggestCategories({
      name,
      description: this.pickString(input.description) ?? this.pickString(textData.description) ?? null,
      addressLine,
      sourceText: rawText,
    });

    const selectedReviews = this.normalizeReviews(input.reviews ?? [], input.raw_payload);
    const description =
      this.pickString(input.description) ??
      this.buildDescription({
        name,
        branchName,
        addressLine,
        ward,
        cityName: location.city_name,
        districtName: location.district_name,
        website: this.pickString(input.website) ?? null,
        phoneNumber: this.pickString(input.phone_number) ?? null,
      });

    const normalized: GoogleMapsNormalizedPayload = {
      name,
      branch_name: branchName,
      description,
      address_line: addressLine,
      ward,
      city_id: location.city_id,
      district_id: location.district_id,
      latitude,
      longitude,
      website: this.pickString(input.website) ?? null,
      phone_number: this.pickString(input.phone_number) ?? null,
      opening_hours: input.opening_hours ?? null,
      media: this.normalizeMedia(input.media),
      menu_image_url: this.pickString(input.menu_image_url) ?? null,
      rating_avg: this.pickNumber(input.rating_avg) ?? null,
      review_count: this.pickNumber(input.review_count) ?? null,
      category_ids: categories.category_ids,
      primary_category_id: categories.primary_category_id,
      selected_reviews: selectedReviews,
    };

    const duplicate = await this.detectDuplicate({
      name,
      addressLine,
      cityId: location.city_id,
      districtId: location.district_id,
      latitude,
      longitude,
      sourcePlaceId,
    });

    return {
      source: 'google_maps',
      source_place_id: sourcePlaceId,
      source_url: sourceUrl,
      input: rawText,
      ...normalized,
      confidence: duplicate.confidence,
      matched_venue_id: duplicate.matched_venue_id,
      duplicate_reason: duplicate.reason,
    };
  }

  async createDraft(userId: string, input: GoogleMapsImportInput) {
    const resolved = await this.resolve(input);
    const normalized = {
      ...resolved,
      ...(input.normalized_payload ?? {}),
    } as GoogleMapsNormalizedPayload & {
      source: 'google_maps';
      source_place_id: string | null;
      source_url: string | null;
      input: string;
      confidence: number;
      matched_venue_id: string | null;
      duplicate_reason: string | null;
    };
    const existingDuplicate = await this.findDuplicateImport(resolved.source_place_id);
    const status =
      resolved.matched_venue_id ||
      existingDuplicate?.published_venue_id ||
      existingDuplicate?.matched_venue_id
        ? VenueImportStatus.DUPLICATE
        : this.deriveStatus(resolved);

    const draft = this.importRepo.create({
      source: 'google_maps',
      source_place_id: resolved.source_place_id,
      source_url: resolved.source_url,
      raw_payload: {
        input: resolved.input,
        original: input.raw_payload ?? {},
        resolved,
      },
      normalized_payload: this.toJsonPayload(normalized),
      status,
      matched_venue_id: normalized.matched_venue_id,
      published_venue_id: null,
      confidence: normalized.confidence,
      created_by: userId,
    });
    const saved = await this.importRepo.save(draft);
    return this.serializeDraft(saved);
  }

  async updateDraft(id: string, patch: Partial<GoogleMapsNormalizedPayload>) {
    const draft = await this.loadDraft(id);
    if (
      draft.status === VenueImportStatus.PUBLISHED ||
      draft.status === VenueImportStatus.REJECTED
    ) {
      throw new ConflictException('Cannot edit a published or rejected draft');
    }
    const normalized = {
      ...(draft.normalized_payload as Partial<GoogleMapsNormalizedPayload>),
      ...patch,
    } as GoogleMapsNormalizedPayload;
    const existingReviews = this.normalizeReviews(
      (draft.normalized_payload as Partial<GoogleMapsNormalizedPayload>).selected_reviews ?? [],
    );
    normalized.selected_reviews = this.mergeReviewMedia(
      this.normalizeReviews(normalized.selected_reviews ?? []),
      existingReviews,
    );
    normalized.media = this.normalizeMedia(normalized.media);
    normalized.category_ids = await this.revalidateCategoryIds(normalized.category_ids ?? []);
    if (!normalized.description) {
      normalized.description = this.buildDescription({
        name: normalized.name,
        branchName: normalized.branch_name,
        addressLine: normalized.address_line,
        ward: normalized.ward,
        cityName: await this.getCityName(normalized.city_id),
        districtName: await this.getDistrictName(normalized.district_id),
        website: normalized.website,
        phoneNumber: normalized.phone_number,
      });
    }

    const enriched = await this.enrichPayload(normalized);
    draft.normalized_payload = enriched.payload as unknown as Record<string, unknown>;
    draft.confidence = enriched.confidence;
    if (!draft.matched_venue_id) {
      draft.matched_venue_id = enriched.matched_venue_id;
    }
    draft.status = enriched.status;
    return this.serializeDraft(await this.importRepo.save(draft));
  }

  async enrichDraft(id: string) {
    const draft = await this.loadDraft(id);
    if (
      draft.status === VenueImportStatus.PUBLISHED ||
      draft.status === VenueImportStatus.REJECTED
    ) {
      return this.serializeDraft(draft);
    }
    const normalized = draft.normalized_payload as Partial<GoogleMapsNormalizedPayload>;
    const enriched = await this.enrichPayload({
      name: normalized.name ?? 'Google Maps place',
      branch_name: normalized.branch_name ?? null,
      description: normalized.description ?? null,
      address_line: normalized.address_line ?? null,
      ward: normalized.ward ?? null,
      city_id: normalized.city_id ?? null,
      district_id: normalized.district_id ?? null,
      latitude: normalized.latitude ?? null,
      longitude: normalized.longitude ?? null,
      website: normalized.website ?? null,
      phone_number: normalized.phone_number ?? null,
      opening_hours: normalized.opening_hours ?? null,
      media: this.normalizeMedia(normalized.media),
      menu_image_url: normalized.menu_image_url ?? null,
      rating_avg: normalized.rating_avg ?? null,
      review_count: normalized.review_count ?? null,
      category_ids: await this.revalidateCategoryIds(normalized.category_ids ?? []),
      primary_category_id: normalized.primary_category_id ?? null,
      selected_reviews: this.normalizeReviews(normalized.selected_reviews ?? []),
    });
    draft.normalized_payload = enriched.payload as unknown as Record<string, unknown>;
    draft.confidence = enriched.confidence;
    draft.matched_venue_id = enriched.matched_venue_id;
    draft.status = enriched.status;
    return this.serializeDraft(await this.importRepo.save(draft));
  }

  async selectReviews(id: string, reviews: GoogleMapsReviewSnippet[]) {
    const draft = await this.loadDraft(id);
    if (
      draft.status === VenueImportStatus.PUBLISHED ||
      draft.status === VenueImportStatus.REJECTED
    ) {
      throw new ConflictException('Cannot edit reviews on a finished draft');
    }
    const normalized = draft.normalized_payload as Partial<GoogleMapsNormalizedPayload>;
    normalized.selected_reviews = this.normalizeReviews(reviews);
    draft.normalized_payload = normalized as Record<string, unknown>;
    draft.status = this.deriveStatus(normalized as GoogleMapsNormalizedPayload);
    return this.serializeDraft(await this.importRepo.save(draft));
  }

  async rejectDraft(id: string) {
    const draft = await this.loadDraft(id);
    draft.status = VenueImportStatus.REJECTED;
    return this.serializeDraft(await this.importRepo.save(draft));
  }

  async publishDraft(id: string, userId: string) {
    const draft = await this.loadDraft(id);
    if (draft.status === VenueImportStatus.PUBLISHED && draft.published_venue_id) {
      await this.safeRecalculateVenueStats(draft.published_venue_id);
      return {
        draft: await this.serializeDraft(draft),
        venue: await this.venueService.findById(draft.published_venue_id),
        seeded_reviews: 0,
      };
    }
    if (draft.status === VenueImportStatus.DUPLICATE && draft.matched_venue_id) {
      this.logger.warn(
        `Publishing duplicate-marked draft ${draft.id} matched to venue ${draft.matched_venue_id}`,
      );
    }

    const normalized = draft.normalized_payload as Partial<GoogleMapsNormalizedPayload>;
    const venueDto = this.toCreateVenueDto(normalized);
    const created = await this.venueService.createCommunity(userId, venueDto);

    const selectedReviews = this.mergeReviewMedia(
      this.normalizeReviews(normalized.selected_reviews ?? []),
      this.normalizeReviews((draft.normalized_payload as Partial<GoogleMapsNormalizedPayload>).selected_reviews ?? []),
    );

    draft.status = VenueImportStatus.PUBLISHED;
    draft.published_venue_id = created.id;
    draft.matched_venue_id = draft.matched_venue_id ?? null;
    draft.normalized_payload = {
      ...normalized,
      selected_reviews: selectedReviews,
    } as Record<string, unknown>;
    await this.importRepo.save(draft);

    let seededReviews: PublishReviewSeedResult[] = [];
    if (selectedReviews.length > 0) {
      try {
        seededReviews = await this.seedReviews(draft.id, created.id, selectedReviews);
      } catch (err) {
        this.logger.warn(
          `Failed to seed Google Maps reviews for draft ${draft.id}: ${(err as Error).message}`,
        );
      }
    }

    await this.safeRecalculateVenueStats(created.id);

    const venue = await this.venueService.findById(created.id);
    return {
      draft: await this.serializeDraft(await this.loadDraft(id)),
      venue,
      seeded_reviews: seededReviews.length,
    };
  }

  private async seedReviews(
    importId: string,
    venueId: string,
    reviews: GoogleMapsReviewSnippet[],
  ): Promise<PublishReviewSeedResult[]> {
    if (reviews.length === 0) return [];
    const payload = {
      venue_id: venueId,
      reviews: reviews.map((review) => ({
        rating: review.rating,
        content: review.content,
        source_review_id: review.source_review_id ?? null,
        author_name: review.author_name ?? null,
        published_at: review.published_at ?? null,
        media: review.media ?? [],
      })),
    };
    const { data } = await firstValueFrom(
      this.http.post(`${INTERACTION_SERVICE_URL}/reviews/seed/google-maps`, payload, {
        timeout: 15000,
      }),
    );

    const createdReviews = Array.isArray(data?.reviews) ? data.reviews : [];
    const rows = createdReviews
      .map((review: Record<string, unknown>, index: number) => {
        const sourceReview = reviews[index];
        if (!review.id) return null;
        return this.sourceRepo.create({
          venue_import_id: importId,
          review_id: String(review.id),
          source: 'google_maps',
          source_review_id: sourceReview?.source_review_id ?? null,
          raw_payload: {
            source_review: sourceReview ?? null,
            response: review,
          },
        });
      })
      .filter(Boolean) as VenueImportReviewSource[];

    if (rows.length > 0) {
      await this.sourceRepo.save(rows);
    }

    return createdReviews
      .map((review: Record<string, unknown>, index: number) => ({
        review_id: String(review.id ?? ''),
        account_id: String(review.account_id ?? ''),
        source_review_id: reviews[index]?.source_review_id ?? null,
      }))
      .filter((row: PublishReviewSeedResult) => row.review_id);
  }

  private async safeRecalculateVenueStats(venueId: string): Promise<void> {
    try {
      await this.recalculateVenueStats(venueId);
    } catch (err) {
      this.logger.warn(
        `Failed to recalculate venue stats for ${venueId}: ${(err as Error).message}`,
      );
    }
  }

  private async recalculateVenueStats(venueId: string): Promise<void> {
    const [row] = await this.dataSource.query<
      Array<{ rating_avg: number | null; review_count: number | null }>
    >(
      `
      SELECT AVG(rating)::float AS rating_avg, COUNT(*)::int AS review_count
      FROM interaction_schema.reviews
      WHERE venue_id = $1
      `,
      [venueId],
    );
    await this.dataSource.query(
      `
      UPDATE venue_schema.venues
         SET rating_avg = COALESCE($1::double precision, 0),
             review_count = COALESCE($2::int, 0)
       WHERE id = $3
      `,
      [row?.rating_avg ?? 0, row?.review_count ?? 0, venueId],
    );
  }

  private async detectDuplicate(input: {
    name: string;
    addressLine: string | null;
    cityId: string | null;
    districtId: string | null;
    latitude: number | null;
    longitude: number | null;
    sourcePlaceId: string | null;
  }): Promise<{ matched_venue_id: string | null; confidence: number; reason: string | null }> {
    if (input.sourcePlaceId) {
      const duplicateImport = await this.findDuplicateImport(input.sourcePlaceId);
      if (duplicateImport) {
        return {
          matched_venue_id: duplicateImport.published_venue_id ?? duplicateImport.matched_venue_id,
          confidence: 1,
          reason: 'same_source_place_id',
        };
      }
    }

    const candidates = await this.venueRepo.find({
      where: { is_active: true },
      relations: { city_ref: true, district_ref: true },
      take: 200,
      order: { created_at: 'DESC' },
    });

    let bestId: string | null = null;
    let bestScore = 0;
    let reason: string | null = null;
    for (const venue of candidates) {
      const score = this.scoreDuplicate(input, venue);
      if (score > bestScore) {
        bestScore = score;
        bestId = venue.id;
        reason = score >= 0.9 ? 'name_address_geo_match' : 'possible_match';
      }
    }

    if (bestScore >= 0.82) {
      return { matched_venue_id: bestId, confidence: bestScore, reason };
    }
    return { matched_venue_id: null, confidence: Math.max(0.25, bestScore), reason: null };
  }

  private scoreDuplicate(
    input: {
      name: string;
      addressLine: string | null;
      cityId: string | null;
      districtId: string | null;
      latitude: number | null;
      longitude: number | null;
    },
    venue: Venue,
  ): number {
    const scoreParts: number[] = [];
    const nameMatch = this.normalizedCompare(input.name, venue.name) ? 0.45 : 0;
    const addressMatch =
      input.addressLine && venue.address_line && this.normalizedCompare(input.addressLine, venue.address_line)
        ? 0.35
        : 0;
    const locationMatch =
      input.cityId && venue.city_id === input.cityId
        ? 0.12
        : input.districtId && venue.district_id === input.districtId
          ? 0.16
          : 0;
    const geoMatch =
      input.latitude !== null && input.longitude !== null
        ? this.distanceScore(input.latitude, input.longitude, venue.latitude, venue.longitude)
        : 0;
    scoreParts.push(nameMatch, addressMatch, locationMatch, geoMatch);
    return Math.min(1, scoreParts.reduce((sum, part) => sum + part, 0));
  }

  private distanceScore(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const distance = this.haversineMeters(lat1, lng1, lat2, lng2);
    if (distance <= 25) return 0.4;
    if (distance <= 75) return 0.3;
    if (distance <= 200) return 0.15;
    return 0;
  }

  private haversineMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const r = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(a));
  }

  private async findDuplicateImport(sourcePlaceId: string | null): Promise<VenueImport | null> {
    if (!sourcePlaceId) return null;
    return this.importRepo.findOne({
      where: { source: 'google_maps', source_place_id: sourcePlaceId },
      order: { created_at: 'DESC' },
    });
  }

  private async loadDraft(id: string): Promise<VenueImport> {
    const draft = await this.importRepo.findOne({ where: { id } });
    if (!draft) throw new NotFoundException('Import draft not found');
    return draft;
  }

  private async serializeDraft(draft: VenueImport) {
    return {
      id: draft.id,
      source: draft.source,
      source_place_id: draft.source_place_id,
      source_url: draft.source_url,
      raw_payload: draft.raw_payload,
      normalized_payload: draft.normalized_payload,
      status: draft.status,
      matched_venue_id: draft.matched_venue_id,
      published_venue_id: draft.published_venue_id,
      confidence: draft.confidence,
      created_by: draft.created_by,
      created_at: draft.created_at,
      updated_at: draft.updated_at,
    };
  }

  private deriveStatus(payload: Partial<GoogleMapsNormalizedPayload>): VenueImportStatus {
    if ((payload.selected_reviews ?? []).length > 0 && this.isReady(payload)) {
      return VenueImportStatus.READY;
    }
    if (this.isReady(payload)) return VenueImportStatus.ENRICHED;
    return VenueImportStatus.DRAFT;
  }

  private async enrichPayload(
    payload: GoogleMapsNormalizedPayload,
  ): Promise<{
    payload: GoogleMapsNormalizedPayload;
    confidence: number;
    matched_venue_id: string | null;
    status: VenueImportStatus;
  }> {
    const location = await this.resolveLocation({
      input: [payload.name, payload.address_line, payload.ward].filter(Boolean).join(' '),
      name: payload.name,
      addressLine: payload.address_line,
      ward: payload.ward,
      latitude: payload.latitude,
      longitude: payload.longitude,
      cityId: payload.city_id,
      districtId: payload.district_id,
    });
    const categories = await this.suggestCategories({
      name: payload.name,
      description: payload.description,
      addressLine: payload.address_line,
      sourceText: [payload.name, payload.description, payload.address_line].filter(Boolean).join(' '),
    });
    const merged: GoogleMapsNormalizedPayload = {
      ...payload,
      city_id: location.city_id ?? payload.city_id,
      district_id: location.district_id ?? payload.district_id,
      category_ids: categories.category_ids.length > 0 ? categories.category_ids : payload.category_ids,
      primary_category_id: categories.primary_category_id ?? payload.primary_category_id,
      description:
        payload.description ??
        this.buildDescription({
          name: payload.name,
          branchName: payload.branch_name,
          addressLine: payload.address_line,
          ward: payload.ward,
          cityName: location.city_name,
          districtName: location.district_name,
          website: payload.website,
          phoneNumber: payload.phone_number,
        }),
      selected_reviews: this.normalizeReviews(payload.selected_reviews ?? []),
      media: this.normalizeMedia(payload.media),
    };
    const duplicate = await this.detectDuplicate({
      name: merged.name,
      addressLine: merged.address_line,
      cityId: merged.city_id,
      districtId: merged.district_id,
      latitude: merged.latitude,
      longitude: merged.longitude,
      sourcePlaceId: null,
    });
    return {
      payload: merged,
      confidence: duplicate.confidence,
      matched_venue_id: duplicate.matched_venue_id,
      status: duplicate.matched_venue_id ? VenueImportStatus.DUPLICATE : this.deriveStatus(merged),
    };
  }

  private async resolveLocation(input: {
    input: string;
    name: string;
    addressLine: string | null;
    ward: string | null;
    latitude: number | null;
    longitude: number | null;
    cityId: string | null;
    districtId: string | null;
  }): Promise<{
    city_id: string | null;
    city_name: string | null;
    district_id: string | null;
    district_name: string | null;
  }> {
    if (input.cityId || input.districtId) {
      return {
        city_id: input.cityId,
        city_name: await this.getCityName(input.cityId),
        district_id: input.districtId,
        district_name: await this.getDistrictName(input.districtId),
      };
    }

    const text = this.normalizeText(
      [input.input, input.name, input.addressLine, input.ward].filter(Boolean).join(' '),
    );
    const cities = await this.locationService.listCities(true);
    let bestCity: { id: string; name: string } | null = null;
    let bestCityScore = 0;
    for (const city of cities) {
      const score = this.scoreName(text, [city.name, city.code, ...(city.aliases ?? [])]);
      if (score > bestCityScore) {
        bestCityScore = score;
        bestCity = { id: city.id, name: city.name };
      }
    }

    const districts = await this.locationService.listDistricts(bestCity?.id ?? undefined, true);
    let bestDistrict: District | null = null;
    let bestDistrictScore = 0;
    for (const district of districts) {
      const score = this.scoreName(text, [district.name, district.code, ...(district.aliases ?? [])]);
      if (score > bestDistrictScore) {
        bestDistrictScore = score;
        bestDistrict = district;
      }
    }

    return {
      city_id: bestDistrict?.city_id ?? bestCity?.id ?? null,
      city_name: bestDistrict
        ? await this.getCityName(bestDistrict.city_id)
        : bestCity?.name ?? null,
      district_id: bestDistrict?.id ?? null,
      district_name: bestDistrict?.name ?? null,
    };
  }

  private async getCityName(cityId: string | null): Promise<string | null> {
    if (!cityId) return null;
    const cities = await this.locationService.listCities(true);
    return cities.find((city) => city.id === cityId)?.name ?? null;
  }

  private async getDistrictName(districtId: string | null): Promise<string | null> {
    if (!districtId) return null;
    const districts = await this.locationService.listDistricts(undefined, true);
    return districts.find((district) => district.id === districtId)?.name ?? null;
  }

  private async suggestCategories(input: {
    name: string;
    description: string | null;
    addressLine: string | null;
    sourceText: string;
  }): Promise<{ category_ids: string[]; primary_category_id: string | null }> {
    const categories = await this.categoryService.findAllActive();
    const scored = categories
      .map((category) => {
        const score = this.scoreName(input.sourceText, [
          category.key,
          category.display_name,
          ...(category.synonyms ?? []),
          input.name,
          input.description ?? '',
          input.addressLine ?? '',
        ]);
        return { category, score };
      })
      .filter((item) => item.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    return {
      category_ids: scored.map((item) => item.category.id),
      primary_category_id: scored[0]?.category.id ?? null,
    };
  }

  private async revalidateCategoryIds(categoryIds: string[]): Promise<string[]> {
    if (!categoryIds.length) return [];
    const categories = await this.categoryService.findByIds(categoryIds);
    return categories.map((category) => category.id);
  }

  private isReady(payload: Partial<GoogleMapsNormalizedPayload>): boolean {
    return Boolean(
      payload.name &&
        payload.address_line &&
        payload.city_id &&
        payload.district_id &&
        typeof payload.latitude === 'number' &&
        typeof payload.longitude === 'number' &&
        (payload.category_ids ?? []).length > 0,
    );
  }

  private toCreateVenueDto(payload: Partial<GoogleMapsNormalizedPayload>) {
    if (
      !payload.name ||
      !payload.address_line ||
      !payload.city_id ||
      !payload.district_id ||
      payload.latitude === null ||
      payload.latitude === undefined ||
      payload.longitude === null ||
      payload.longitude === undefined
    ) {
      throw new ConflictException('Draft is missing required venue fields');
    }
    return {
      name: payload.name,
      branch_name: payload.branch_name ?? undefined,
      description: payload.description ?? undefined,
      address_line: payload.address_line,
      ward: payload.ward ?? undefined,
      city_id: payload.city_id,
      district_id: payload.district_id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      total_capacity: 50,
      max_group_size: 10,
      is_group_friendly: false,
      media: payload.media ?? [],
      menu_image_url: payload.menu_image_url ?? undefined,
      opening_hours: payload.opening_hours ?? undefined,
      category_ids: payload.category_ids ?? [],
      primary_category_id: payload.primary_category_id ?? undefined,
    };
  }

  private buildDescription(input: {
    name: string;
    branchName: string | null;
    addressLine: string | null;
    ward: string | null;
    cityName: string | null;
    districtName: string | null;
    website: string | null;
    phoneNumber: string | null;
  }): string {
    const lines = [
      `${input.name}${input.branchName ? ` - ${input.branchName}` : ''} là địa điểm được nhập từ Google Maps.`,
      [input.addressLine, input.ward, input.districtName, input.cityName].filter(Boolean).join(', '),
      [input.phoneNumber ? `Số điện thoại: ${input.phoneNumber}` : null, input.website ? `Website: ${input.website}` : null]
        .filter(Boolean)
        .join('. '),
    ].filter(Boolean);
    return lines.join(' ');
  }

  private toJsonPayload(payload: GoogleMapsResolvedPayload): Record<string, unknown> {
    return {
      source: payload.source,
      source_place_id: payload.source_place_id,
      source_url: payload.source_url,
      input: payload.input,
      name: payload.name,
      branch_name: payload.branch_name,
      description: payload.description,
      address_line: payload.address_line,
      ward: payload.ward,
      city_id: payload.city_id,
      district_id: payload.district_id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      website: payload.website,
      phone_number: payload.phone_number,
      opening_hours: payload.opening_hours,
      media: payload.media,
      menu_image_url: payload.menu_image_url,
      rating_avg: payload.rating_avg,
      review_count: payload.review_count,
      category_ids: payload.category_ids,
      primary_category_id: payload.primary_category_id,
      selected_reviews: payload.selected_reviews,
      confidence: payload.confidence,
      matched_venue_id: payload.matched_venue_id,
      duplicate_reason: payload.duplicate_reason,
    };
  }

  private normalizeReviews(
    reviews: GoogleMapsReviewSnippet[] | unknown[],
    rawPayload?: Record<string, unknown>,
  ): GoogleMapsReviewSnippet[] {
    const rows = Array.isArray(reviews) ? reviews : [];
    const mapped = rows
      .map((review) => {
        if (!review || typeof review !== 'object') return null;
        const value = review as Record<string, unknown>;
        const content = this.pickString(value.content) ?? this.pickString(value.text) ?? '';
        if (!content) return null;
        const rating = this.pickNumber(value.rating) ?? 0;
        const media = Array.isArray(value.media)
          ? value.media
              .map((item) => (typeof item === 'string' ? item.trim() : ''))
              .filter((item): item is string => item.length > 0)
          : [];
        return {
          source_review_id: this.pickString(value.source_review_id) ?? null,
          author_name: this.pickString(value.author_name) ?? null,
          rating: Math.max(1, Math.min(5, rating || 0)),
          content,
          published_at: this.pickString(value.published_at) ?? null,
          media,
        } satisfies GoogleMapsReviewSnippet;
      })
      .filter(Boolean) as GoogleMapsReviewSnippet[];

    if (mapped.length > 0) return mapped;

    const rawReviews = rawPayload?.['reviews'];
    if (Array.isArray(rawReviews)) {
      return this.normalizeReviews(rawReviews as unknown[]);
    }
    return [];
  }

  private mergeReviewMedia(
    nextReviews: GoogleMapsReviewSnippet[],
    previousReviews: GoogleMapsReviewSnippet[],
  ): GoogleMapsReviewSnippet[] {
    if (previousReviews.length === 0) return nextReviews;
    const previousByKey = new Map<string, string[]>();
    previousReviews.forEach((review, index) => {
      previousByKey.set(this.reviewMatchKey(review, index), this.normalizeMedia(review.media));
    });

    return nextReviews.map((review, index) => {
      const existingMedia = previousByKey.get(this.reviewMatchKey(review, index)) ?? [];
      const nextMedia = this.normalizeMedia(review.media);
      return {
        ...review,
        media: nextMedia.length > 0 ? nextMedia : existingMedia,
      };
    });
  }

  private reviewMatchKey(review: GoogleMapsReviewSnippet, fallbackIndex: number): string {
    const sourceId = this.pickString(review.source_review_id);
    if (sourceId) return `source:${sourceId}`;
    const author = this.normalizeText(review.author_name ?? '');
    const content = this.normalizeText(review.content ?? '');
    const publishedAt = this.normalizeText(review.published_at ?? '');
    if (author || content || publishedAt) {
      return `text:${author}|${content}|${publishedAt}`;
    }
    return `index:${fallbackIndex}`;
  }

  private normalizeMedia(media: unknown): string[] {
    if (!Array.isArray(media)) return [];
    return media
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  private pickInput(input: GoogleMapsImportInput): string {
    const candidate =
      this.pickString(input.input) ??
      this.pickString(input.source_url) ??
      this.pickString(input.source_place_id) ??
      this.pickString(input.raw_payload?.['input']) ??
      this.pickString(input.raw_payload?.['text']) ??
      '';
    return candidate;
  }

  private parseGoogleMapsUrl(url: string): {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  } {
    const out: {
      name?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    } = {};
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      out.address = this.pickString(u.searchParams.get('q')) ?? undefined;
      out.name = this.pickString(u.searchParams.get('query')) ?? undefined;
      const placePath = u.pathname.match(/\/place\/([^/]+)/i);
      if (!out.name && placePath?.[1]) {
        out.name = decodeURIComponent(placePath[1]).replace(/\+/g, ' ');
      }
      const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      if (atMatch) {
        out.latitude = Number(atMatch[1]);
        out.longitude = Number(atMatch[2]);
      }
      const geoMatch = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
      if (geoMatch) {
        out.latitude = Number(geoMatch[1]);
        out.longitude = Number(geoMatch[2]);
      }
      if (!out.address) {
        out.address = this.pickString(u.searchParams.get('query_place_id')) ?? undefined;
      }
    } catch {
      // Ignore URL parsing failures and fall back to free text.
    }
    return out;
  }

  private parseFreeText(text: string): { name?: string; address?: string; description?: string } {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return {};
    if (lines.length === 1) {
      return { name: lines[0] };
    }
    return {
      name: lines[0],
      address: lines[1],
      description: lines.slice(2).join(' '),
    };
  }

  private extractUrl(text: string): string | null {
    const match = text.match(/https?:\/\/\S+/i);
    return match ? match[0] : null;
  }

  private extractPlaceId(text: string | null | undefined): string | null {
    if (!text) return null;
    const placeId = text.match(/[?&]query_place_id=([^&\s]+)/i)?.[1];
    if (placeId) return decodeURIComponent(placeId);
    const pathId = text.match(/\/place\/([^/?&#]+)/i)?.[1];
    if (pathId) return decodeURIComponent(pathId);
    return null;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizedCompare(a: string, b: string): boolean {
    return this.normalizeText(a) === this.normalizeText(b);
  }

  private scoreName(value: string, candidates: string[]): number {
    const text = this.normalizeText(value);
    if (!text) return 0;
    let best = 0;
    for (const candidate of candidates) {
      const normalized = this.normalizeText(candidate);
      if (!normalized) continue;
      if (text === normalized) return 1;
      if (text.includes(normalized) || normalized.includes(text)) {
        best = Math.max(best, 0.8);
        continue;
      }
      const overlap = this.tokenOverlap(text, normalized);
      best = Math.max(best, overlap);
    }
    return best;
  }

  private tokenOverlap(a: string, b: string): number {
    const aTokens = new Set(a.split(' ').filter(Boolean));
    const bTokens = new Set(b.split(' ').filter(Boolean));
    if (aTokens.size === 0 || bTokens.size === 0) return 0;
    let intersection = 0;
    for (const token of aTokens) {
      if (bTokens.has(token)) intersection++;
    }
    return intersection / Math.max(aTokens.size, bTokens.size);
  }

  private pickString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    return text ? text : null;
  }

  private pickNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
