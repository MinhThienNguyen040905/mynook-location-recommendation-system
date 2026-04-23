# CLAUDE.md — search-ai-service

## Overview

NestJS HTTP microservice chạy ở **port 3005**. Xử lý logic tìm kiếm hybrid (semantic + tag-based), AI review processing, và embedding generation. **Không bao giờ** bị gọi trực tiếp từ frontend — mọi request đều qua `api-gateway`.

## Vai trò trong kiến trúc

- **Hybrid Search**: Tìm kiếm venues kết hợp semantic vector search (pgvector) + tag filtering + capacity/time filters
- **AI Review Processing**: Nhận event `venue.reviewed` từ interaction-service qua RabbitMQ, phân tích review bằng Groq AI (sentiment, tag extraction), upsert VenueTag scores
- **Embedding Generation**: Sử dụng HuggingFace API (all-MiniLM-L6-v2, 384 dimensions) để tạo vector embeddings
- Quản lý tags và search logs

## Key Files

| File | Mô tả |
|------|-------|
| `src/main.ts` | Bootstrap — HTTP server + RMQ consumer (`search_ai_queue`) |
| `src/app/app.module.ts` | Root module — import SearchModule, ReviewProcessingModule |
| **Search Module** | |
| `src/app/modules/search/search.module.ts` | Search feature module |
| `src/app/modules/search/search.controller.ts` | `GET /search?q=...` — hybrid search endpoint |
| `src/app/modules/search/search-parser.service.ts` | Parse Vietnamese queries: extract capacity ("5 người"), time context ("buổi tối") |
| `src/app/modules/search/embedding.service.ts` | HuggingFace API → 384-dim vector embeddings |
| `src/app/modules/search/venue-search.service.ts` | Core hybrid search: pgvector cosine + tag scores + rating + filters |
| **Review Processing Module** | |
| `src/app/modules/review-processing/review-processing.module.ts` | AI review processing module |
| `src/app/modules/review-processing/review-processing.controller.ts` | RMQ handler for `venue.reviewed` event |
| `src/app/modules/review-processing/review-processing.service.ts` | Process review: Groq AI analysis → upsert VenueTag scores (transaction) |
| `src/app/modules/review-processing/groq-ai.service.ts` | Groq SDK integration (Llama 3.3) — sentiment, tag extraction, time context |

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/search?q=...&limit=20` | Optional (via headers) | Hybrid venue search |

## RabbitMQ Events

| Event | Direction | Mô tả |
|-------|-----------|-------|
| `venue.reviewed` | **Consumes** (from interaction-service) | Triggers AI analysis of new review |

After processing a review, search-ai-service calls back to interaction-service via HTTP:
`PATCH /reviews/:reviewId/ai-analysis` to save the AI analysis JSON.

## Database Entities

- `Tag`, `VenueTag`, `SearchLog`, `Venue` (từ `@mynook/database`)
- `Venue.embedding`: pgvector `vector(384)` column with HNSW index

## Hybrid Search Algorithm

1. **Parse query** → extract `cleanQuery`, `capacity`, `timeContext` (Vietnamese NLP regex)
2. **Embed** `cleanQuery` → 384-dim vector via HuggingFace API
3. **SQL query** combining:
   - Semantic similarity: pgvector cosine distance (`<=>` operator)
   - Hard filter: `max_group_size >= capacity`
   - Hard filter: `current_crowd_level != 'full'`
   - Tag scores: JOIN VenueTag, filter by time_frame
   - Fallback: ILIKE text search when embedding unavailable
4. **Ranking**: `0.5 * semantic + 0.3 * tag_score + 0.2 * rating`

## Environment Variables

```env
DATABASE_URL=postgresql://...
PORT=3005
GROQ_API_KEY=gsk_...              # Groq AI for review analysis
HUGGINGFACE_API_TOKEN=hf_...      # HuggingFace for embeddings (optional, works without token for public models)
INTERACTION_SERVICE_URL=http://localhost:3004  # For AI analysis callback
```

## Conventions

- Mỗi feature mới tạo module riêng trong `modules/<feature>/`
- RMQ event handlers dùng manual ACK (`noAck: false`)
- Database transactions dùng `queryRunner` cho upsert operations
- AI service calls wrapped trong try/catch — không fail nếu AI không available
