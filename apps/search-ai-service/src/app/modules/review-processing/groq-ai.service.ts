import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Groq from 'groq-sdk';

export interface ReviewAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentiment_score: number; // -1.0 to 1.0
  positive_tags: string[]; // tag keys praised (snake_case)
  negative_tags: string[]; // tag keys criticized (snake_case)
  new_tags: Array<{ key: string; display_name: string; category: string }>;
  time_context: 'morning' | 'afternoon' | 'evening' | 'all_day' | null;
  summary: string; // one-line summary of the review
}

const SYSTEM_PROMPT = `Bạn là AI phân tích review địa điểm (quán cà phê, nhà hàng, coworking, v.v.) tại Việt Nam.

Nhiệm vụ: Phân tích review của khách hàng, trích xuất thông tin có cấu trúc.

Quy tắc:
1. Tag keys PHẢI là snake_case tiếng Anh (VD: good_coffee, quiet_space, friendly_staff).
2. Nếu review nhắc đến thời gian (sáng/trưa/tối), set time_context tương ứng. Không nhắc → null.
3. sentiment_score: -1.0 (rất tiêu cực) đến 1.0 (rất tích cực).
4. new_tags chỉ chứa tag CHƯA có trong danh sách existing_tags được cung cấp.
5. Trả về JSON object duy nhất, KHÔNG có text/markdown bao quanh.

JSON schema bắt buộc:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentiment_score": number,
  "positive_tags": ["tag_key", ...],
  "negative_tags": ["tag_key", ...],
  "new_tags": [{"key": "snake_case", "display_name": "Tên hiển thị", "category": "category"}],
  "time_context": "morning" | "afternoon" | "evening" | "all_day" | null,
  "summary": "Tóm tắt ngắn 1 dòng"
}`;

@Injectable()
export class GroqAiService implements OnModuleInit {
  private readonly logger = new Logger(GroqAiService.name);
  private groq!: Groq;

  onModuleInit() {
    const apiKey = process.env['GROQ_API_KEY'];
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY not set — AI analysis will be skipped');
    }
    this.groq = new Groq({ apiKey: apiKey || '' });
  }

  /**
   * Analyze a review using Groq LLM (Llama 3 / Mixtral).
   * Returns structured analysis with sentiment, tags, time context.
   */
  async analyzeReview(
    reviewContent: string,
    rating: number,
    existingTagKeys: string[],
  ): Promise<ReviewAnalysis | null> {
    if (!process.env['GROQ_API_KEY']) {
      this.logger.warn('Skipping AI analysis — no GROQ_API_KEY');
      return null;
    }

    const userPrompt = `Review (rating ${rating}/5):
"${reviewContent}"

Existing tags trong hệ thống: [${existingTagKeys.join(', ')}]

Hãy phân tích review này và trả về JSON theo schema đã quy định.`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1024,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        this.logger.warn('Empty response from Groq');
        return null;
      }

      const parsed = JSON.parse(content) as ReviewAnalysis;
      return this.validateAnalysis(parsed);
    } catch (error) {
      this.logger.error(`Groq AI analysis failed: ${error}`);
      return null;
    }
  }

  /** Basic validation / sanitization of AI output */
  private validateAnalysis(data: ReviewAnalysis): ReviewAnalysis {
    return {
      sentiment: ['positive', 'negative', 'neutral', 'mixed'].includes(
        data.sentiment,
      )
        ? data.sentiment
        : 'neutral',
      sentiment_score: Math.max(-1, Math.min(1, data.sentiment_score ?? 0)),
      positive_tags: Array.isArray(data.positive_tags)
        ? data.positive_tags.filter((t) => typeof t === 'string')
        : [],
      negative_tags: Array.isArray(data.negative_tags)
        ? data.negative_tags.filter((t) => typeof t === 'string')
        : [],
      new_tags: Array.isArray(data.new_tags)
        ? data.new_tags.filter(
            (t) => t.key && t.display_name && t.category,
          )
        : [],
      time_context: ['morning', 'afternoon', 'evening', 'all_day'].includes(
        data.time_context as string,
      )
        ? data.time_context
        : null,
      summary:
        typeof data.summary === 'string' ? data.summary : 'No summary',
    };
  }
}
