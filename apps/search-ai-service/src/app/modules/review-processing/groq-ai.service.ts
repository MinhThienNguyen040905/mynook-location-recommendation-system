import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

export class ReviewAnalysisFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewAnalysisFailedError';
  }
}

const SYSTEM_PROMPT = `You analyze Vietnamese location reviews for cafes, restaurants, coworking spaces, and similar venues.

Task: extract structured review analysis for recommendation/search ranking.

Rules:
1. Tag keys MUST be English snake_case, for example good_coffee, quiet_space, friendly_staff.
2. If the review mentions a time of day, set time_context to morning, afternoon, evening, or all_day. If not mentioned, use null.
3. sentiment_score ranges from -1.0 (very negative) to 1.0 (very positive).
4. new_tags must only contain tags that are not present in existing_tags.
5. Return exactly one JSON object. Do not include markdown or surrounding text.

Required JSON schema:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentiment_score": number,
  "positive_tags": ["tag_key"],
  "negative_tags": ["tag_key"],
  "new_tags": [{"key": "snake_case", "display_name": "Display name", "category": "category"}],
  "time_context": "morning" | "afternoon" | "evening" | "all_day" | null,
  "summary": "Short one-line summary"
}`;

@Injectable()
export class GroqAiService implements OnModuleInit {
  private readonly logger = new Logger(GroqAiService.name);
  private groq!: Groq;
  private apiKey = '';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.apiKey =
      this.configService.get<string>('GROQ_API_KEY') ||
      process.env['GROQ_API_KEY'] ||
      '';

    if (!this.apiKey) {
      this.logger.warn('GROQ_API_KEY not set - AI analysis will be skipped');
    }

    this.groq = new Groq({ apiKey: this.apiKey });
  }

  /**
   * Analyze a review using Groq LLM.
   * Returns structured analysis with sentiment, tags, time context.
   */
  async analyzeReview(
    reviewContent: string,
    rating: number,
    existingTagKeys: string[],
  ): Promise<ReviewAnalysis | null> {
    if (!this.apiKey) {
      throw new ReviewAnalysisFailedError(
        'GROQ_API_KEY is not available in the running search-ai-service process. Restart the service after adding it to .env.',
      );
    }

    const promptReviewContent = reviewContent.trim().slice(0, 2000);
    const userPrompt = `Review (rating ${rating}/5):
"${promptReviewContent}"

existing_tags: [${existingTagKeys.join(', ')}]

Analyze this review and return JSON using the required schema.`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 512,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new ReviewAnalysisFailedError('Groq returned an empty response');
      }

      const parsed = JSON.parse(content) as ReviewAnalysis;
      return this.validateAnalysis(parsed);
    } catch (error) {
      if (error instanceof ReviewAnalysisFailedError) {
        this.logger.error(error.message);
        throw error;
      }

      const message = this.formatError(error);
      this.logger.error(`Groq AI analysis failed: ${message}`);
      throw new ReviewAnalysisFailedError(message);
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

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
