-- Migration 007: Venue categories + search enhancements
--
-- Mục đích:
-- 1. Bổ sung bảng `categories` + junction `venue_categories` (M:N) ở venue_schema
--    → cho phép phân loại venue (cà phê, nhà hàng, lẩu, ...) để search lọc chính xác hơn.
-- 2. Bật extensions `pg_trgm` + `unaccent` để fuzzy-match tên venue
--    (xử lý typo, không dấu: "huu duyen" → "Hữu Duyên").
-- 3. Thêm cột `usage_count` vào `search_schema.tags` để chọn top-N tags
--    gửi kèm vào Groq prompt (tránh prompt quá dài).
-- 4. Thêm trigram indexes trên venues.name / branch_name để match tên nhanh.

-- ── 1. Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── 1b. IMMUTABLE wrapper cho unaccent ───────────────────────────
-- Postgres's `unaccent()` mặc định là STABLE (phụ thuộc text-search
-- dictionary), nên KHÔNG dùng được trực tiếp trong expression index.
-- Fix chuẩn: bọc bằng wrapper SQL đánh dấu IMMUTABLE, truyền trực tiếp
-- dictionary `public.unaccent` để kết quả deterministic.
-- Wrapper này phải được dùng ở CẢ index định nghĩa lẫn query runtime
-- thì planner mới dùng được index.
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  STRICT
AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$;

-- ── 2. Category master table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_schema.categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           varchar(50)  NOT NULL UNIQUE,
  display_name  varchar(100) NOT NULL,
  synonyms      text[]       NOT NULL DEFAULT '{}',
  description   text,
  display_order int          NOT NULL DEFAULT 0,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_key ON venue_schema.categories(key);
CREATE INDEX IF NOT EXISTS idx_categories_active_order
  ON venue_schema.categories(is_active, display_order);

-- ── 3. Venue ↔ Category junction (M:N) ───────────────────────────
CREATE TABLE IF NOT EXISTS venue_schema.venue_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid NOT NULL REFERENCES venue_schema.venues(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES venue_schema.categories(id) ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_venue_category UNIQUE (venue_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_categories_venue_id
  ON venue_schema.venue_categories(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_categories_category_id
  ON venue_schema.venue_categories(category_id);

-- Chỉ 1 primary category / venue
CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_primary_category
  ON venue_schema.venue_categories(venue_id)
  WHERE is_primary = true;

-- ── 4. Trigram indexes để fuzzy match tên quán ───────────────────
-- Dùng f_unaccent wrapper + lower để query không cần dấu / phân biệt
-- hoa thường. PHẢI dùng cùng wrapper này trong runtime query để planner
-- chọn được index.
CREATE INDEX IF NOT EXISTS idx_venues_name_trgm
  ON venue_schema.venues
  USING gin ((public.f_unaccent(lower(name))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_venues_branch_trgm
  ON venue_schema.venues
  USING gin ((public.f_unaccent(lower(coalesce(branch_name, '')))) gin_trgm_ops);

-- Address index cho location search ("cà phê đường Lê Lợi")
CREATE INDEX IF NOT EXISTS idx_venues_address_trgm
  ON venue_schema.venues
  USING gin ((public.f_unaccent(lower(address))) gin_trgm_ops);

-- ── 5. Tag usage counter (để chọn top-N tags cho Groq prompt) ────
ALTER TABLE search_schema.tags
  ADD COLUMN IF NOT EXISTS usage_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tags_usage_count
  ON search_schema.tags(usage_count DESC);

-- Khởi tạo usage_count từ venue_tags hiện có
UPDATE search_schema.tags t
SET usage_count = sub.cnt
FROM (
  SELECT tag_id, COUNT(*) AS cnt
  FROM search_schema.venue_tags
  WHERE score > 0
  GROUP BY tag_id
) sub
WHERE t.id = sub.tag_id;

-- ── 6. Seed categories ──────────────────────────────────────────
INSERT INTO venue_schema.categories (key, display_name, synonyms, description, display_order)
VALUES
  ('cafe', 'Quán cà phê',
    ARRAY['coffee','caphe','ca phe','quán nước','coffeeshop','coffee shop','tiệm cà phê'],
    'Quán phục vụ cà phê, trà, nước giải khát — không gian thường để ngồi lâu, làm việc, tán gẫu',
    10),
  ('restaurant', 'Nhà hàng',
    ARRAY['nha hang','restaurant','quán ăn','tiệm ăn','eatery'],
    'Địa điểm phục vụ các bữa ăn chính, món ăn đa dạng',
    20),
  ('hotpot', 'Quán lẩu',
    ARRAY['lẩu','lau','hotpot','hot pot','lẩu nướng','shabu','lẩu bò','lẩu thái','lẩu chay'],
    'Quán chuyên lẩu các loại — bò, hải sản, chay, Thái, ...',
    30),
  ('bbq', 'Quán nướng',
    ARRAY['nướng','bbq','barbecue','grill','thịt nướng','bbq korean','quán nướng hàn'],
    'Quán chuyên đồ nướng — BBQ, thịt nướng Hàn, Nhật, đồ nướng đường phố',
    40),
  ('seafood', 'Quán hải sản',
    ARRAY['hải sản','hai san','seafood','quán ốc','oc','cua ghẹ','tôm hùm'],
    'Chuyên hải sản tươi sống — ốc, cua, tôm, cá',
    50),
  ('bar', 'Bar / Pub',
    ARRAY['bar','pub','club','bia','beer','cocktail','rooftop bar','lounge'],
    'Bar, pub, lounge — nơi phục vụ đồ uống có cồn, không khí sôi động',
    60),
  ('dessert', 'Quán tráng miệng',
    ARRAY['tráng miệng','dessert','kem','chè','bánh ngọt','bingsu','yogurt','ice cream'],
    'Chuyên kem, chè, bánh ngọt, đồ tráng miệng',
    70),
  ('bubble_tea', 'Trà sữa',
    ARRAY['trà sữa','tra sua','bubble tea','boba','milktea','milk tea','trân châu'],
    'Quán trà sữa, đồ uống topping trân châu',
    80),
  ('vegan', 'Quán chay',
    ARRAY['chay','vegan','vegetarian','đồ chay','cơm chay'],
    'Quán chuyên đồ chay, thuần chay',
    90),
  ('fast_food', 'Thức ăn nhanh',
    ARRAY['fast food','fastfood','đồ ăn nhanh','burger','pizza','gà rán','kfc','lotteria'],
    'Chuỗi / quán phục vụ thức ăn nhanh — burger, pizza, gà rán',
    100),
  ('street_food', 'Quán ăn vặt / đường phố',
    ARRAY['ăn vặt','an vat','street food','đường phố','vỉa hè','bánh tráng','quán cóc'],
    'Ăn vặt, quà vặt, đồ ăn đường phố',
    110),
  ('coworking', 'Không gian làm việc',
    ARRAY['coworking','co-working','working space','work space','làm việc','văn phòng chia sẻ'],
    'Không gian làm việc chung, thiết kế cho freelancer, remote worker',
    120),
  ('library', 'Thư viện / Book cafe',
    ARRAY['thư viện','thu vien','library','book cafe','book café','đọc sách'],
    'Không gian yên tĩnh để đọc sách, kết hợp cà phê sách',
    130),
  ('karaoke', 'Karaoke',
    ARRAY['karaoke','hát karaoke','phòng hát','ktv'],
    'Địa điểm hát karaoke, phòng hát nhóm / gia đình',
    140),
  ('buffet', 'Buffet',
    ARRAY['buffet','bufe','ăn buffet','buffet lẩu','buffet nướng'],
    'Nhà hàng buffet — ăn tự chọn, buffet lẩu nướng',
    150)
ON CONFLICT (key) DO NOTHING;
