import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
  AnalyzeMenuImageResult,
  AnalyzedMenuCategory,
} from './dto/analyze-menu.dto.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL = process.env['GROQ_VISION_MODEL'] ?? 'meta-llama/llama-4-scout-17b-16e-instruct';

@Injectable()
export class MenuAnalyzeService {
  constructor(private readonly http: HttpService) {}

  async analyzeMenuImage(imageUrl: string): Promise<AnalyzeMenuImageResult> {
    const apiKey = process.env['GROQ_API_KEY'];
    if (!apiKey) {
      throw new BadRequestException('GROQ_API_KEY is not configured');
    }

    const prompt = `Analyze this menu image and extract all menu items with their categories and prices.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "categories": [
    {
      "name": "Category Name",
      "items": [
        { "name": "Item Name", "price": 35000 }
      ]
    }
  ]
}

Rules:
- Prices must be numbers (in VND, no currency symbols). If no price is visible, use 0.
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
            max_tokens: 4096,
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

      const content: string = data.choices?.[0]?.message?.content ?? '';
      return this.parseResponse(content);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to analyze menu image: ${msg}`,
      );
    }
  }

  private parseResponse(content: string): AnalyzeMenuImageResult {
    // Strip markdown code fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(cleaned) as { categories?: AnalyzedMenuCategory[] };
      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        throw new Error('Missing categories array');
      }

      // Validate & clean the data
      const categories: AnalyzedMenuCategory[] = parsed.categories.map((cat) => ({
        name: String(cat.name || 'Menu'),
        items: Array.isArray(cat.items)
          ? cat.items.map((item) => ({
              name: String(item.name || ''),
              price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0,
            }))
          : [],
      }));

      return { categories };
    } catch {
      throw new BadRequestException(
        'Failed to parse menu analysis result. Please try again with a clearer image.',
      );
    }
  }
}
