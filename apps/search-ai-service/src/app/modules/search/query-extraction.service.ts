import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Groq from 'groq-sdk';
import { TimeContext } from '@mynook/database';
import { CategoryTagProviderService } from './category-tag-provider.service.js';
import { QueryCacheService } from './query-cache.service.js';

export type SearchIntent = 'name' | 'attribute' | 'mixed' | 'unclear';
export type Confidence = 'high' | 'medium' | 'low';

export interface ExtractedLocation {
  city: string | null;
  district: string | null;
  street: string | null;
}

export interface ExtractedQuery {
  intent: SearchIntent;
  possible_name: string | null;
  categories: string[]; // valid DB keys
  tags: string[]; // valid DB keys
  excluded_tags: string[]; // valid DB keys (negation)
  location: ExtractedLocation;
  require_high_rating: boolean;
  time_context: TimeContext | null;
  confidence: Confidence;
}

/** Empty / fallback extraction — search degrades gracefully to semantic+rating */
export const FALLBACK_EXTRACTION: ExtractedQuery = {
  intent: 'unclear',
  possible_name: null,
  categories: [],
  tags: [],
  excluded_tags: [],
  location: { city: null, district: null, street: null },
  require_high_rating: false,
  time_context: null,
  confidence: 'low',
};

const GROQ_TIMEOUT_MS = 3500;
const GROQ_MODEL = 'llama-3.1-8b-instant';
const MAX_QUERY_LENGTH = 300;

@Injectable()
export class QueryExtractionService implements OnModuleInit {
  private readonly logger = new Logger(QueryExtractionService.name);
  private groq!: Groq;

  constructor(
    private readonly provider: CategoryTagProviderService,
    private readonly cache: QueryCacheService,
  ) {}

  onModuleInit() {
    const apiKey = process.env['GROQ_API_KEY'];
    if (!apiKey) {
      this.logger.warn(
        'GROQ_API_KEY not set — query extraction will fall back to unclear intent',
      );
    }
    this.groq = new Groq({ apiKey: apiKey || '' });
  }

  /**
   * Extract structured search intent from a raw user query.
   * Cached with single-flight. Returns FALLBACK_EXTRACTION on any failure
   * so the search SQL always has something safe to work with.
   */
  async extract(rawQuery: string): Promise<ExtractedQuery> {
    const trimmed = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
    if (trimmed.length < 2) return FALLBACK_EXTRACTION;
    if (!process.env['GROQ_API_KEY']) return FALLBACK_EXTRACTION;

    return this.cache.singleFlight(trimmed, () => this.doExtract(trimmed));
  }

  private async doExtract(query: string): Promise<ExtractedQuery> {
    const [categories, tags] = await Promise.all([
      this.provider.getCategories(),
      this.provider.getTopTags(),
    ]);

    const systemPrompt = this.buildSystemPrompt(categories, tags);
    const userPrompt = `Search query: "${query}"\n\nTrả về JSON theo schema.`;

    try {
      const completion = await Promise.race([
        this.groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 400,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Groq timeout')), GROQ_TIMEOUT_MS),
        ),
      ]);

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        this.logger.warn('Empty response from Groq extraction');
        return FALLBACK_EXTRACTION;
      }

      const parsed = JSON.parse(raw);
      return this.sanitize(parsed, categories, tags);
    } catch (err) {
      this.logger.warn(`Groq extraction failed, using fallback: ${err}`);
      return FALLBACK_EXTRACTION;
    }
  }

  private buildSystemPrompt(
    categories: { key: string; display_name: string; synonyms: string[] }[],
    tags: { key: string; display_name: string }[],
  ): string {
    const categoryList = categories
      .map(
        (c) =>
          `- ${c.key}: ${c.display_name}` +
          (c.synonyms.length ? ` (synonyms: ${c.synonyms.join(', ')})` : ''),
      )
      .join('\n');

    const tagList = tags
      .map((t) => `- ${t.key}: ${t.display_name}`)
      .join('\n');

    return `Bạn là AI phân tích ý định tìm kiếm địa điểm tiếng Việt cho ứng dụng MyNook.

Nhiệm vụ: Từ câu tìm kiếm của người dùng, trích xuất thông tin có cấu trúc.

Quy tắc QUAN TRỌNG:
1. Chỉ trả về key TỒN TẠI trong danh sách dưới. KHÔNG bịa key mới.
2. Map synonyms về key chuẩn (ví dụ: "quán nước" → cafe, "lẩu bò" → hotpot).
3. Nếu không chắc chắn, trả về mảng rỗng / null thay vì đoán bừa.
4. JSON output thuần, KHÔNG markdown.

Phân loại intent:
- "name": có dấu hiệu tìm tên quán cụ thể (danh từ riêng, thương hiệu). VD: "Highlands Bitexco", "Quán Hữu Duyên"
- "attribute": chỉ mô tả đặc tính mơ hồ, không có tên. VD: "quán cà phê yên tĩnh"
- "mixed": vừa có tên vừa có đặc tính. VD: "Phúc Long có wifi mạnh"
- "unclear": không rõ ý định

possible_name: CHỈ phần có thể là tên quán — loại bỏ các từ chung như "quán", "nhà hàng", "cà phê", "cho N người", số lượng, thời gian.
  VD: "quán lẩu chay hữu duyên" → "hữu duyên"
  VD: "nhà hàng yên tĩnh" → null
  VD: "Highlands Bitexco" → "highlands bitexco"

excluded_tags: tags bị PHỦ ĐỊNH trong câu ("không ồn", "không đông" → excluded_tags có thể là ["noisy","crowded"] nếu tồn tại trong danh sách).

require_high_rating: true nếu user đòi hỏi chất lượng cao ("nổi tiếng", "review tốt", "đánh giá cao", "uy tín").

time_context: "morning"|"afternoon"|"evening"|"all_day"|null. Map: sáng=morning, trưa/chiều=afternoon, tối/đêm=evening, cả ngày=all_day.

location: tách city/district/street nếu đề cập ("quận 1" → district="Quận 1", "đường Lê Lợi" → street="Lê Lợi").

CATEGORIES (${categories.length}):
${categoryList}

TAGS (${tags.length}):
${tagList}

JSON schema bắt buộc:
{
  "intent": "name"|"attribute"|"mixed"|"unclear",
  "possible_name": string|null,
  "categories": string[],
  "tags": string[],
  "excluded_tags": string[],
  "location": { "city": string|null, "district": string|null, "street": string|null },
  "require_high_rating": boolean,
  "time_context": "morning"|"afternoon"|"evening"|"all_day"|null,
  "confidence": "high"|"medium"|"low"
}`;
  }

  private sanitize(
    raw: unknown,
    categories: { key: string }[],
    tags: { key: string }[],
  ): ExtractedQuery {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const validIntents: SearchIntent[] = ['name', 'attribute', 'mixed', 'unclear'];
    const validConf: Confidence[] = ['high', 'medium', 'low'];
    const validTimes: TimeContext[] = [
      TimeContext.MORNING,
      TimeContext.AFTERNOON,
      TimeContext.EVENING,
      TimeContext.ALL_DAY,
    ];

    const categoryKeys = new Set(categories.map((c) => c.key));
    const tagKeys = new Set(tags.map((t) => t.key));

    const asArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

    const asStrOrNull = (v: unknown): string | null =>
      typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;

    const loc = (obj['location'] ?? {}) as Record<string, unknown>;

    return {
      intent: validIntents.includes(obj['intent'] as SearchIntent)
        ? (obj['intent'] as SearchIntent)
        : 'unclear',
      possible_name: asStrOrNull(obj['possible_name']),
      categories: asArray(obj['categories']).filter((k) => categoryKeys.has(k)),
      tags: asArray(obj['tags']).filter((k) => tagKeys.has(k)),
      excluded_tags: asArray(obj['excluded_tags']).filter((k) => tagKeys.has(k)),
      location: {
        city: asStrOrNull(loc['city']),
        district: asStrOrNull(loc['district']),
        street: asStrOrNull(loc['street']),
      },
      require_high_rating: obj['require_high_rating'] === true,
      time_context: validTimes.includes(obj['time_context'] as TimeContext)
        ? (obj['time_context'] as TimeContext)
        : null,
      confidence: validConf.includes(obj['confidence'] as Confidence)
        ? (obj['confidence'] as Confidence)
        : 'low',
    };
  }
}
