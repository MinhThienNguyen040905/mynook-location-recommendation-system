import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { City, District } from '@mynook/database';
import {
  CreateCityDto,
  UpdateCityDto,
  CreateDistrictDto,
  UpdateDistrictDto,
} from './dto/location.dto.js';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Cities ───────────────────────────────────────────────────────

  async listCities(includeInactive = false): Promise<City[]> {
    return this.cityRepo.find({
      where: includeInactive ? {} : { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findCityById(id: string): Promise<City> {
    const c = await this.cityRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('City not found');
    return c;
  }

  async createCity(dto: CreateCityDto): Promise<City> {
    const existing = await this.cityRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`City with code "${dto.code}" already exists`);
    }
    const aliases = this.normAliases(dto.aliases);
    const [{ id }] = await this.dataSource.query<{ id: string }[]>(
      `INSERT INTO venue_schema.cities (code, name, aliases, centroid, is_active)
       VALUES ($1, $2, $3, ${this.pointSql(dto.longitude, dto.latitude, 4, 5)}, $${dto.longitude !== undefined && dto.latitude !== undefined ? 6 : 4})
       RETURNING id`,
      this.buildCityParams(dto.code, dto.name, aliases, dto.longitude, dto.latitude, dto.is_active),
    );
    return this.findCityById(id);
  }

  async updateCity(id: string, dto: UpdateCityDto): Promise<City> {
    const c = await this.findCityById(id);
    const name = dto.name ?? c.name;
    const aliases = dto.aliases ? this.normAliases(dto.aliases) : c.aliases;
    const isActive = dto.is_active ?? c.is_active;
    const hasCoords = dto.longitude !== undefined && dto.latitude !== undefined;
    const sql = hasCoords
      ? `UPDATE venue_schema.cities
         SET name = $1, aliases = $2, is_active = $3,
             centroid = ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
             updated_at = now()
         WHERE id = $6`
      : `UPDATE venue_schema.cities
         SET name = $1, aliases = $2, is_active = $3, updated_at = now()
         WHERE id = $4`;
    const params = hasCoords
      ? [name, aliases, isActive, dto.longitude, dto.latitude, id]
      : [name, aliases, isActive, id];
    await this.dataSource.query(sql, params);
    return this.findCityById(id);
  }

  async removeCity(id: string): Promise<void> {
    const c = await this.findCityById(id);
    await this.cityRepo.remove(c);
  }

  // ── Districts ────────────────────────────────────────────────────

  async listDistricts(cityId?: string, includeInactive = false): Promise<District[]> {
    const qb = this.districtRepo.createQueryBuilder('d').orderBy('d.name', 'ASC');
    if (cityId) qb.andWhere('d.city_id = :cityId', { cityId });
    if (!includeInactive) qb.andWhere('d.is_active = true');
    return qb.getMany();
  }

  async findDistrictById(id: string): Promise<District> {
    const d = await this.districtRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('District not found');
    return d;
  }

  async createDistrict(dto: CreateDistrictDto): Promise<District> {
    const existing = await this.districtRepo.findOne({
      where: { city_id: dto.city_id, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `District code "${dto.code}" already exists for this city`,
      );
    }
    const aliases = this.normAliases(dto.aliases);
    const hasCoords = dto.longitude !== undefined && dto.latitude !== undefined;
    const sql = hasCoords
      ? `INSERT INTO venue_schema.districts (city_id, code, name, aliases, centroid, is_active)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7)
         RETURNING id`
      : `INSERT INTO venue_schema.districts (city_id, code, name, aliases, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`;
    const params = hasCoords
      ? [dto.city_id, dto.code, dto.name, aliases, dto.longitude, dto.latitude, dto.is_active ?? true]
      : [dto.city_id, dto.code, dto.name, aliases, dto.is_active ?? true];
    const [{ id }] = await this.dataSource.query<{ id: string }[]>(sql, params);
    return this.findDistrictById(id);
  }

  async updateDistrict(id: string, dto: UpdateDistrictDto): Promise<District> {
    const d = await this.findDistrictById(id);
    const name = dto.name ?? d.name;
    const aliases = dto.aliases ? this.normAliases(dto.aliases) : d.aliases;
    const isActive = dto.is_active ?? d.is_active;
    const hasCoords = dto.longitude !== undefined && dto.latitude !== undefined;
    const sql = hasCoords
      ? `UPDATE venue_schema.districts
         SET name = $1, aliases = $2, is_active = $3,
             centroid = ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
             updated_at = now()
         WHERE id = $6`
      : `UPDATE venue_schema.districts
         SET name = $1, aliases = $2, is_active = $3, updated_at = now()
         WHERE id = $4`;
    const params = hasCoords
      ? [name, aliases, isActive, dto.longitude, dto.latitude, id]
      : [name, aliases, isActive, id];
    await this.dataSource.query(sql, params);
    return this.findDistrictById(id);
  }

  async removeDistrict(id: string): Promise<void> {
    const d = await this.findDistrictById(id);
    await this.districtRepo.remove(d);
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private normAliases(list?: string[]): string[] {
    return (list ?? []).map((a) => a.toLowerCase().trim()).filter(Boolean);
  }

  private pointSql(lng: number | undefined, lat: number | undefined, lngParam: number, latParam: number): string {
    return lng !== undefined && lat !== undefined
      ? `ST_SetSRID(ST_MakePoint($${lngParam}, $${latParam}), 4326)::geography`
      : 'NULL';
  }

  private buildCityParams(
    code: string,
    name: string,
    aliases: string[],
    lng: number | undefined,
    lat: number | undefined,
    isActive: boolean | undefined,
  ): unknown[] {
    return lng !== undefined && lat !== undefined
      ? [code, name, aliases, lng, lat, isActive ?? true]
      : [code, name, aliases, isActive ?? true];
  }
}
