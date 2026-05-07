import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Groq from 'groq-sdk';

const GROQ_TIMEOUT_MS = 4000;
const GROQ_MODEL = 'llama-3.1-8b-instant';
const MAX_DESC_LENGTH = 1500;

export interface DescriptionTagAnalysis {
  /** Tag keys the AI thinks apply to this venue, drawn from the candidate list. */
  tags: string[];
}

/**
 * Groq client specialised for analysing owner-supplied venue descriptions and
 * proposing applicable tag keys from a fixed candidate list. Distinct from
 * review analysis (different prompt, neutral framing, no sentiment) — owner
 * descriptions are self-claims, not user experiences, so we don't emit
 * positive/negative tags or sentiment scores.
 */
@Injectable()
export class DescriptionGroqService implements OnModuleInit {
  private readonly logger = new Logger(DescriptionGroqService.name);
  private groq!: Groq;

  onModuleInit() {
    const apiKey = process.env['GROQ_API_KEY'];
    if (!apiKey) {
      this.logger.warn(
        'GROQ_API_KEY not set — description tagging will be skipped',
      );
    }
    this.groq = new Groq({ apiKey: apiKey || '' });
  }

  async extractTags(opts: {
    name: string;
    branchName: string | null;
    description: string;
    categoryKeys: string[];
    candidateTags: { key: string; display_name: string; category: string | null }[];
  }): Promise<DescriptionTagAnalysis | null> {
    if (!process.env['GROQ_API_KEY']) return null;
    if (opts.candidateTags.length === 0) {
      this.logger.warn('No candidate tags available — skipping description analysis');
      return null;
    }

    const description = opts.description.trim().slice(0, MAX_DESC_LENGTH);

    const tagList = opts.candidateTags
      .map((t) => `- ${t.key}: ${t.display_name}${t.category ? ` [${t.category}]` : ''}`)
      .join('\n');

    const systemPrompt = `Bạn là AI phân tích MÔ TẢ địa điểm do CHỦ QUÁN (hoặc người đóng góp cộng đồng) tự khai. Mục tiêu: trích các "tính cách" / đặc điểm có thể quan sát được của quán để hệ thống dùng làm tag tìm kiếm khởi đầu.

NGUYÊN TẮC QUAN TRỌNG:
1. CHỈ trả về key TỒN TẠI trong "DANH SÁCH TAG ĐƯỢC PHÉP" bên dưới. KHÔNG bịa key mới.
2. Mô tả là TỰ KHAI — chỉ rút các tính chất QUAN SÁT ĐƯỢC, không suy diễn xa. Nếu không chắc, để mảng rỗng.
3. KHÔNG cần phân biệt positive/negative — đây không phải review.
4. Ưu tiên các tag có ích cho người tìm kiếm (không gian, phong cách, dịch vụ, đối tượng phù hợp). Bỏ qua tag mơ hồ.
5. Tối đa 8 tag. JSON output thuần, KHÔNG markdown.

DANH SÁCH TAG ĐƯỢC PHÉP (${opts.candidateTags.length}):
${tagList}

JSON schema BẮT BUỘC:
{ "tags": [string, ...] }`;

    const userPrompt = `Tên quán: ${opts.name}${opts.branchName ? ` — ${opts.branchName}` : ''}
Loại quán: ${opts.categoryKeys.length ? opts.categoryKeys.join(', ') : '(chưa xác định)'}

Mô tả:
"${description}"

Trả về JSON theo schema. Chỉ chọn tag từ danh sách được phép.`;

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
          max_tokens: 300,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Groq timeout')), GROQ_TIMEOUT_MS),
        ),
      ]);

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        this.logger.warn('Empty response from Groq description analysis');
        return null;
      }

      const parsed = JSON.parse(raw) as { tags?: unknown };
      const tags = Array.isArray(parsed.tags)
        ? parsed.tags.filter(
            (x): x is string => typeof x === 'string' && x.length > 0,
          )
        : [];
      return { tags: Array.from(new Set(tags)).slice(0, 8) };
    } catch (err) {
      this.logger.warn(`Description tag extraction failed: ${err}`);
      return null;
    }
  }
}
