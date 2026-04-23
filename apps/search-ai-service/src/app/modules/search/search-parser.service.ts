import { Injectable } from '@nestjs/common';
import { TimeContext } from '@mynook/database';

export interface ParsedQuery {
  /** Query with capacity/time hints removed */
  cleanQuery: string;
  /** Extracted group size (e.g. "5 người" → 5) */
  capacity: number | null;
  /** Extracted time context (Sáng/Trưa/Tối) */
  timeContext: TimeContext | null;
}

@Injectable()
export class SearchParserService {
  /**
   * Parse a raw Vietnamese search query to extract structured filters.
   *
   * Examples:
   *   "quán cà phê cho 5 người buổi tối" → { cleanQuery: "quán cà phê", capacity: 5, timeContext: EVENING }
   *   "nhà hàng 10 khách sáng" → { cleanQuery: "nhà hàng", capacity: 10, timeContext: MORNING }
   */
  parse(rawQuery: string): ParsedQuery {
    let query = rawQuery.trim();

    const capacity = this.extractCapacity(query);
    query = this.removeCapacityPattern(query);

    const timeContext = this.extractTimeContext(query);
    query = this.removeTimePattern(query);

    // Clean up extra whitespace
    const cleanQuery = query.replace(/\s+/g, ' ').trim();

    return { cleanQuery, capacity, timeContext };
  }

  // ── Capacity extraction ───────────────────────────────────────

  private readonly CAPACITY_REGEX =
    /(\d+)\s*(?:người|khách|bạn|nhóm|members?|guests?|people|pax)/gi;

  /** Also match "nhóm 5", "group of 10" */
  private readonly CAPACITY_PREFIX_REGEX =
    /(?:nhóm|group\s+of)\s+(\d+)/gi;

  private extractCapacity(query: string): number | null {
    // Try "5 người" pattern first
    const match = this.CAPACITY_REGEX.exec(query);
    if (match) return parseInt(match[1], 10);

    // Try "nhóm 5" pattern
    const prefixMatch = this.CAPACITY_PREFIX_REGEX.exec(query);
    if (prefixMatch) return parseInt(prefixMatch[1], 10);

    return null;
  }

  private removeCapacityPattern(query: string): string {
    return query
      .replace(this.CAPACITY_REGEX, '')
      .replace(this.CAPACITY_PREFIX_REGEX, '')
      .replace(/\s*(cho|for)\s*/gi, ' ');
  }

  // ── Time context extraction ───────────────────────────────────

  private readonly TIME_PATTERNS: Array<{
    regex: RegExp;
    context: TimeContext;
  }> = [
    {
      regex: /(?:buổi\s*)?(?:sáng|morning)/gi,
      context: TimeContext.MORNING,
    },
    {
      regex: /(?:buổi\s*)?(?:trưa|chiều|afternoon)/gi,
      context: TimeContext.AFTERNOON,
    },
    {
      regex: /(?:buổi\s*)?(?:tối|đêm|evening|night)/gi,
      context: TimeContext.EVENING,
    },
    {
      regex: /(?:cả\s*ngày|all\s*day)/gi,
      context: TimeContext.ALL_DAY,
    },
  ];

  private extractTimeContext(query: string): TimeContext | null {
    for (const { regex, context } of this.TIME_PATTERNS) {
      // Reset regex lastIndex
      regex.lastIndex = 0;
      if (regex.test(query)) return context;
    }
    return null;
  }

  private removeTimePattern(query: string): string {
    let result = query;
    for (const { regex } of this.TIME_PATTERNS) {
      regex.lastIndex = 0;
      result = result.replace(regex, '');
    }
    return result;
  }
}
