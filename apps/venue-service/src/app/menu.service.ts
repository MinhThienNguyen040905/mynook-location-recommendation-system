import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue, MenuCategory, MenuItem } from '@mynook/database';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from './dto/index.js';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(MenuCategory)
    private readonly categoryRepo: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly itemRepo: Repository<MenuItem>,
  ) {}

  /* ── Helpers ─────────────────────────────────────────── */

  private async assertOwnership(venueId: string, ownerId: string): Promise<void> {
    const venue = await this.venueRepo.findOne({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Venue not found');
    if (venue.owner_id !== ownerId) {
      throw new ForbiddenException('You do not own this venue');
    }
  }

  /* ── Categories ──────────────────────────────────────── */

  async getCategories(venueId: string): Promise<MenuCategory[]> {
    return this.categoryRepo.find({
      where: { venue_id: venueId },
      order: { display_order: 'ASC', name: 'ASC' },
      relations: ['items'],
    });
  }

  async createCategory(
    venueId: string,
    ownerId: string,
    dto: CreateCategoryDto,
  ): Promise<MenuCategory> {
    await this.assertOwnership(venueId, ownerId);
    const cat = this.categoryRepo.create({ ...dto, venue_id: venueId });
    return this.categoryRepo.save(cat);
  }

  async updateCategory(
    categoryId: string,
    ownerId: string,
    dto: UpdateCategoryDto,
  ): Promise<MenuCategory> {
    const cat = await this.categoryRepo.findOne({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.assertOwnership(cat.venue_id, ownerId);
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(categoryId: string, ownerId: string): Promise<void> {
    const cat = await this.categoryRepo.findOne({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.assertOwnership(cat.venue_id, ownerId);
    await this.itemRepo.delete({ category_id: categoryId });
    await this.categoryRepo.remove(cat);
  }

  /* ── Items ───────────────────────────────────────────── */

  async getItems(venueId: string): Promise<MenuItem[]> {
    return this.itemRepo.find({
      where: { venue_id: venueId },
      order: { name: 'ASC' },
    });
  }

  async createItem(
    venueId: string,
    ownerId: string,
    dto: CreateMenuItemDto,
  ): Promise<MenuItem> {
    await this.assertOwnership(venueId, ownerId);
    const item = this.itemRepo.create({ ...dto, venue_id: venueId });
    return this.itemRepo.save(item);
  }

  async updateItem(
    itemId: string,
    ownerId: string,
    dto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Menu item not found');
    await this.assertOwnership(item.venue_id, ownerId);
    Object.assign(item, dto);
    return this.itemRepo.save(item);
  }

  async deleteItem(itemId: string, ownerId: string): Promise<void> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Menu item not found');
    await this.assertOwnership(item.venue_id, ownerId);
    await this.itemRepo.remove(item);
  }
}
