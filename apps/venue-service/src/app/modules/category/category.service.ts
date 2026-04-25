import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Category, VenueCategory } from '@mynook/database';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(VenueCategory)
    private readonly venueCategoryRepo: Repository<VenueCategory>,
  ) {}

  /** Public: list active categories sorted by display_order */
  async findAllActive(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { is_active: true },
      order: { display_order: 'ASC', display_name: 'ASC' },
    });
  }

  /** Admin: list every category including inactive */
  async findAll(): Promise<Category[]> {
    return this.categoryRepo.find({
      order: { display_order: 'ASC', display_name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Category> {
    const c = await this.categoryRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  async findByIds(ids: string[]): Promise<Category[]> {
    if (ids.length === 0) return [];
    return this.categoryRepo.find({ where: { id: In(ids) } });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryRepo.findOne({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException(`Category with key "${dto.key}" already exists`);
    }
    const entity = this.categoryRepo.create({
      key: dto.key,
      display_name: dto.display_name,
      synonyms: dto.synonyms ?? [],
      description: dto.description ?? null,
      display_order: dto.display_order ?? 0,
      is_active: dto.is_active ?? true,
    });
    return this.categoryRepo.save(entity);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const c = await this.findById(id);
    Object.assign(c, dto);
    return this.categoryRepo.save(c);
  }

  async remove(id: string): Promise<void> {
    const c = await this.findById(id);
    await this.categoryRepo.remove(c);
  }

  // ── Venue ↔ Category links ───────────────────────────────────────

  /** Categories attached to a venue, with primary flag preserved */
  async getCategoriesForVenue(
    venueId: string,
  ): Promise<Array<Category & { is_primary: boolean }>> {
    const links = await this.venueCategoryRepo.find({
      where: { venue_id: venueId },
      relations: { category: true },
      order: { is_primary: 'DESC', created_at: 'ASC' },
    });
    return links
      .filter((l) => !!l.category)
      .map((l) => ({ ...(l.category as Category), is_primary: l.is_primary }));
  }

  /** Resolve the primary category id for a venue, or null */
  async getPrimaryCategoryId(venueId: string): Promise<string | null> {
    const link = await this.venueCategoryRepo.findOne({
      where: { venue_id: venueId, is_primary: true },
    });
    return link?.category_id ?? null;
  }

  /**
   * Replace the venue's categories with the given list.
   * First id in `categoryIds` becomes primary unless `primaryId` is provided.
   * Invalid ids are silently dropped.
   */
  async setCategoriesForVenue(
    venueId: string,
    categoryIds: string[],
    primaryId?: string,
  ): Promise<Category[]> {
    const validCategories = await this.findByIds(categoryIds);
    const validIds = validCategories.map((c) => c.id);

    await this.venueCategoryRepo.delete({ venue_id: venueId });

    if (validIds.length === 0) return [];

    const resolvedPrimary =
      primaryId && validIds.includes(primaryId) ? primaryId : validIds[0];

    const rows = validIds.map((categoryId) =>
      this.venueCategoryRepo.create({
        venue_id: venueId,
        category_id: categoryId,
        is_primary: categoryId === resolvedPrimary,
      }),
    );
    await this.venueCategoryRepo.save(rows);
    return validCategories;
  }
}
