import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
  AnalyzeMenuImageResult,
  AnalyzedMenuCategory,
} from './dto/analyze-menu.dto.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Đổi qua GROQ_VISION_MODEL khi Groq gỡ model (spec 018). qwen3.8-27b đang ở trạng thái Preview. */
const GROQ_VISION_MODEL = process.env['GROQ_VISION_MODEL'] || 'qwen/qwen3.8-27b';
/**
 * Gói miễn phí Groq giới hạn ~1.000 token đầu ra / phút cho model vision —
 * xin nhiều hơn sẽ bị 429 hoặc cắt cụt. JSON một dòng giúp ~20–30 món vừa giới hạn.
 */
const GROQ_VISION_MAX_TOKENS = 1000;

/** Thông báo khi menu vượt giới hạn — hiển thị nguyên văn trên giao diện (spec 018 AC-4.3). */
export const MENU_TOO_LONG_MESSAGE = 'Menu quá dài — hãy chụp từng phần';

/** Giá dưới ngưỡng này coi là viết tắt nghìn đồng (vd "62" = 62.000đ) — spec 018 AC-4.2. */
const THOUSAND_VND_THRESHOLD = 1000;

class MenuTooLongError extends Error {}

@Injectable()
export class MenuAnalyzeService {
  private readonly logger = new Logger(MenuAnalyzeService.name);

  constructor(private readonly http: HttpService) {
    this.logger.log(`Menu vision model: ${GROQ_VISION_MODEL}`);
  }

  async analyzeMenuImage(imageUrl: string): Promise<AnalyzeMenuImageResult> {
    const apiKey = process.env['GROQ_API_KEY'];
    if (!apiKey) {
      throw new BadRequestException('GROQ_API_KEY is not configured');
    }

    const prompt = `Analyze this menu image and extract all menu items with their categories and prices.

Return ONLY valid JSON on a SINGLE LINE, no indentation, no markdown, no explanation. Format:
{"categories":[{"name":"Category Name","items":[{"name":"Item Name","price":35000}]}]}

Rules:
- Prices must be full VND numbers, no currency symbols. Menus often abbreviate thousands ("62", "45k", "45K" mean 62000 / 45000) — write the full amount. If no price is visible, use 0.
- Group items into their menu categories as shown in the image.
- If no clear categories exist, use a single category "Menu".
- Include ALL items visible in the image.
- Use Vietnamese text as-is if the menu is in Vietnamese.`;

    try {
      const { data } = await firstValueFrom(
        this.http.post(
          GROQ_API_URL,
          {
            model: GROQ_VISION_MODEL,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: imageUrl } },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: GROQ_VISION_MAX_TOKENS,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          },
        ),
      );

      const choice = data.choices?.[0];
      const content: string = choice?.message?.content ?? '';
      if (choice?.finish_reason === 'length') throw new MenuTooLongError();
      return this.parseResponse(content);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (error instanceof MenuTooLongError || status === 429) {
        this.logger.warn(`Menu analysis hit output limit (status ${status ?? 'truncated'})`);
        throw new BadRequestException(MENU_TOO_LONG_MESSAGE);
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to analyze menu image: ${msg}`);
    }
  }

  private parseResponse(content: string): AnalyzeMenuImageResult {
    // Bỏ khối suy nghĩ (một số model vision trả <think>…</think>) và code fence
    let cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: { categories?: AnalyzedMenuCategory[] };
    try {
      parsed = JSON.parse(cleaned) as { categories?: AnalyzedMenuCategory[] };
    } catch {
      // JSON mở đầu đúng nhưng bị cắt giữa chừng = vượt giới hạn token đầu ra
      if (cleaned.startsWith('{') && !cleaned.trimEnd().endsWith('}')) {
        throw new BadRequestException(MENU_TOO_LONG_MESSAGE);
      }
      throw new BadRequestException(
        'Failed to parse menu analysis result. Please try again with a clearer image.',
      );
    }
    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      throw new BadRequestException(
        'Failed to parse menu analysis result. Please try again with a clearer image.',
      );
    }

    // Validate & clean the data
    const categories: AnalyzedMenuCategory[] = parsed.categories.map((cat) => ({
      name: String(cat.name || 'Menu'),
      items: Array.isArray(cat.items)
        ? cat.items.map((item) => ({
            name: String(item.name || ''),
            price: normalizeVndPrice(item.price),
          }))
        : [],
    }));

    return { categories };
  }
}

/** Số → VND đầy đủ: "62" / 62 → 62000; "45k" → 45000; không hợp lệ → 0. */
export function normalizeVndPrice(raw: unknown): number {
  let value: number;
  if (typeof raw === 'number') {
    value = raw;
  } else {
    const text = String(raw ?? '').trim().toLowerCase();
    const k = /k$/.test(text);
    value = parseFloat(text.replace(/[^\d.,]/g, '').replace(/,/g, '.')) || 0;
    if (k) value *= 1000;
  }
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 0 && value < THOUSAND_VND_THRESHOLD) value *= 1000;
  return Math.round(value);
}
