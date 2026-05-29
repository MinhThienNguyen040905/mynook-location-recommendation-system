-- Migration 008: Refactor venue addresses with normalized cities/districts + PostGIS
--
-- Why:
-- 1. `district` and `city` stored as free-text caused AI search to miss
--    variants ("Q1" vs "Quận 1" vs "quan 1"). Master tables with aliases fix this.
-- 2. Splitting `address` → `address_line` + `ward` + `district_id` + `city_id`
--    enables exact-match filtering (fast UUID equal) while keeping trigram fuzzy
--    match on `address_line` for free-text street search.
-- 3. PostGIS `geography(Point)` generated column unlocks distance queries
--    ("gần đây 2km") + centroid-based ranking without extra compute on each query.
--
-- Compat note: existing sample venues lose their text address. Users said this
-- is OK (sample data). Old columns are dropped at the end.

-- ── 1. Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── 2. Cities master table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_schema.cities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       varchar(10)  NOT NULL UNIQUE,          -- 'HCM','HN','DN'
  name       varchar(100) NOT NULL,                  -- 'Hồ Chí Minh'
  aliases    text[]       NOT NULL DEFAULT '{}',     -- normalized lower-case aliases
  centroid   geography(Point, 4326),
  is_active  boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cities_aliases ON venue_schema.cities USING gin (aliases);
CREATE INDEX IF NOT EXISTS idx_cities_name_trgm
  ON venue_schema.cities USING gin ((public.f_unaccent(lower(name))) gin_trgm_ops);

-- ── 3. Districts master table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_schema.districts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id    uuid NOT NULL REFERENCES venue_schema.cities(id) ON DELETE CASCADE,
  code       varchar(20)  NOT NULL,                  -- 'Q1','TD','HK'
  name       varchar(100) NOT NULL,                  -- 'Quận 1'
  aliases    text[]       NOT NULL DEFAULT '{}',     -- lower-case aliases
  centroid   geography(Point, 4326),
  is_active  boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_district_city_code UNIQUE (city_id, code)
);

CREATE INDEX IF NOT EXISTS idx_districts_city_id ON venue_schema.districts(city_id);
CREATE INDEX IF NOT EXISTS idx_districts_aliases ON venue_schema.districts USING gin (aliases);
CREATE INDEX IF NOT EXISTS idx_districts_name_trgm
  ON venue_schema.districts USING gin ((public.f_unaccent(lower(name))) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_districts_centroid_gist
  ON venue_schema.districts USING gist (centroid);

-- ── 4. Venues — add new columns ──────────────────────────────────
ALTER TABLE venue_schema.venues
  ADD COLUMN IF NOT EXISTS address_line varchar(255),
  ADD COLUMN IF NOT EXISTS ward         varchar(100),
  ADD COLUMN IF NOT EXISTS district_id  uuid REFERENCES venue_schema.districts(id),
  ADD COLUMN IF NOT EXISTS city_id      uuid REFERENCES venue_schema.cities(id);

-- PostGIS generated point: lng first, lat second
ALTER TABLE venue_schema.venues
  ADD COLUMN IF NOT EXISTS location geography(Point, 4326)
    GENERATED ALWAYS AS (
      CASE
        WHEN longitude IS NOT NULL AND latitude IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        ELSE NULL
      END
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_venues_city_id     ON venue_schema.venues(city_id);
CREATE INDEX IF NOT EXISTS idx_venues_district_id ON venue_schema.venues(district_id);
CREATE INDEX IF NOT EXISTS idx_venues_location_gist
  ON venue_schema.venues USING gist (location);
CREATE INDEX IF NOT EXISTS idx_venues_address_line_trgm
  ON venue_schema.venues USING gin ((public.f_unaccent(lower(coalesce(address_line, '')))) gin_trgm_ops);

-- ── 5. Seed cities ───────────────────────────────────────────────
INSERT INTO venue_schema.cities (code, name, aliases, centroid) VALUES
  ('HCM', 'Hồ Chí Minh',
   ARRAY['hcm','tphcm','tp hcm','tp.hcm','ho chi minh','hochiminh','saigon','sài gòn','sai gon','sg'],
   ST_SetSRID(ST_MakePoint(106.7009, 10.7769), 4326)::geography),
  ('HN',  'Hà Nội',
   ARRAY['hn','ha noi','hanoi','hà nội','thủ đô','thu do','capital'],
   ST_SetSRID(ST_MakePoint(105.8542, 21.0285), 4326)::geography),
  ('DN',  'Đà Nẵng',
   ARRAY['dn','da nang','danang','đà nẵng'],
   ST_SetSRID(ST_MakePoint(108.2022, 16.0544), 4326)::geography)
ON CONFLICT (code) DO NOTHING;

-- ── 6. Seed districts — HCM ──────────────────────────────────────
WITH hcm AS (SELECT id FROM venue_schema.cities WHERE code = 'HCM')
INSERT INTO venue_schema.districts (city_id, code, name, aliases, centroid)
SELECT hcm.id, v.code, v.name, v.aliases,
       ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
FROM hcm,
(VALUES
  ('Q1',  'Quận 1',       ARRAY['q1','q.1','quan 1','quận 1','district 1','d1','dist 1','quan1'],                    106.7010, 10.7770),
  ('Q3',  'Quận 3',       ARRAY['q3','q.3','quan 3','quận 3','district 3','d3','quan3'],                             106.6840, 10.7830),
  ('Q4',  'Quận 4',       ARRAY['q4','q.4','quan 4','quận 4','district 4','d4','quan4'],                             106.7040, 10.7590),
  ('Q5',  'Quận 5',       ARRAY['q5','q.5','quan 5','quận 5','district 5','d5','quan5','chợ lớn','cho lon'],         106.6690, 10.7540),
  ('Q6',  'Quận 6',       ARRAY['q6','q.6','quan 6','quận 6','district 6','d6','quan6'],                             106.6350, 10.7460),
  ('Q7',  'Quận 7',       ARRAY['q7','q.7','quan 7','quận 7','district 7','d7','quan7','phú mỹ hưng','phu my hung'], 106.7220, 10.7320),
  ('Q8',  'Quận 8',       ARRAY['q8','q.8','quan 8','quận 8','district 8','d8','quan8'],                             106.6290, 10.7240),
  ('Q10', 'Quận 10',      ARRAY['q10','q.10','quan 10','quận 10','district 10','d10','quan10'],                      106.6660, 10.7730),
  ('Q11', 'Quận 11',      ARRAY['q11','q.11','quan 11','quận 11','district 11','d11','quan11'],                      106.6500, 10.7660),
  ('Q12', 'Quận 12',      ARRAY['q12','q.12','quan 12','quận 12','district 12','d12','quan12'],                      106.6440, 10.8630),
  ('TD',  'Thủ Đức',      ARRAY['td','thu duc','thủ đức','thuduc','q2','quận 2','quan 2','q9','quận 9','quan 9'],   106.7680, 10.8510),
  ('BT',  'Bình Thạnh',   ARRAY['bt','binh thanh','bình thạnh','binhthanh'],                                         106.7100, 10.8080),
  ('PN',  'Phú Nhuận',    ARRAY['pn','phu nhuan','phú nhuận','phunhuan'],                                            106.6800, 10.7950),
  ('TB',  'Tân Bình',     ARRAY['tb','tan binh','tân bình','tanbinh'],                                               106.6530, 10.7970),
  ('TP',  'Tân Phú',      ARRAY['tp','tan phu','tân phú','tanphu'],                                                  106.6280, 10.7900),
  ('GV',  'Gò Vấp',       ARRAY['gv','go vap','gò vấp','govap'],                                                     106.6660, 10.8360),
  ('BTN', 'Bình Tân',     ARRAY['btn','binh tan','bình tân','binhtan'],                                              106.6020, 10.7650),
  ('NB',  'Nhà Bè',       ARRAY['nb','nha be','nhà bè','huyện nhà bè'],                                              106.7090, 10.6980),
  ('BC',  'Bình Chánh',   ARRAY['bc','binh chanh','bình chánh','huyện bình chánh'],                                  106.5950, 10.7360),
  ('HM',  'Hóc Môn',      ARRAY['hm','hoc mon','hóc môn','huyện hóc môn'],                                           106.5930, 10.8890),
  ('CC',  'Củ Chi',       ARRAY['cc','cu chi','củ chi','huyện củ chi'],                                              106.4940, 10.9740),
  ('CG',  'Cần Giờ',      ARRAY['cg','can gio','cần giờ','huyện cần giờ'],                                           106.9560, 10.4110)
) v(code, name, aliases, lng, lat)
ON CONFLICT (city_id, code) DO NOTHING;

-- ── 7. Seed districts — Hà Nội ───────────────────────────────────
WITH hn AS (SELECT id FROM venue_schema.cities WHERE code = 'HN')
INSERT INTO venue_schema.districts (city_id, code, name, aliases, centroid)
SELECT hn.id, v.code, v.name, v.aliases,
       ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
FROM hn,
(VALUES
  ('HK',  'Hoàn Kiếm',    ARRAY['hk','hoan kiem','hoàn kiếm','quận hoàn kiếm','phố cổ','pho co'],      105.8520, 21.0300),
  ('BD',  'Ba Đình',      ARRAY['bd','ba dinh','ba đình','quận ba đình'],                              105.8330, 21.0340),
  ('DD',  'Đống Đa',      ARRAY['dd','dong da','đống đa','quận đống đa'],                              105.8290, 21.0120),
  ('HBT', 'Hai Bà Trưng', ARRAY['hbt','hai ba trung','hai bà trưng','quận hai bà trưng'],              105.8570, 21.0050),
  ('CG',  'Cầu Giấy',     ARRAY['cg','cau giay','cầu giấy','quận cầu giấy'],                           105.8020, 21.0300),
  ('TX',  'Thanh Xuân',   ARRAY['tx','thanh xuan','thanh xuân','quận thanh xuân'],                     105.8060, 20.9950),
  ('HD',  'Hà Đông',      ARRAY['hd','ha dong','hà đông','quận hà đông'],                              105.7680, 20.9550),
  ('NTL', 'Nam Từ Liêm',  ARRAY['ntl','nam tu liem','nam từ liêm','quận nam từ liêm'],                 105.7630, 21.0180),
  ('BTL', 'Bắc Từ Liêm',  ARRAY['btl','bac tu liem','bắc từ liêm','quận bắc từ liêm'],                 105.7640, 21.0680),
  ('TH',  'Tây Hồ',       ARRAY['th','tay ho','tây hồ','quận tây hồ','west lake'],                     105.8200, 21.0700),
  ('LB',  'Long Biên',    ARRAY['lb','long bien','long biên','quận long biên'],                        105.9020, 21.0400),
  ('HM',  'Hoàng Mai',    ARRAY['hm','hoang mai','hoàng mai','quận hoàng mai'],                        105.8620, 20.9670)
) v(code, name, aliases, lng, lat)
ON CONFLICT (city_id, code) DO NOTHING;

-- ── 8. Seed districts — Đà Nẵng ──────────────────────────────────
WITH dn AS (SELECT id FROM venue_schema.cities WHERE code = 'DN')
INSERT INTO venue_schema.districts (city_id, code, name, aliases, centroid)
SELECT dn.id, v.code, v.name, v.aliases,
       ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
FROM dn,
(VALUES
  ('HC',  'Hải Châu',     ARRAY['hc','hai chau','hải châu','quận hải châu'],            108.2200, 16.0650),
  ('TK',  'Thanh Khê',    ARRAY['tk','thanh khe','thanh khê','quận thanh khê'],         108.1810, 16.0600),
  ('ST',  'Sơn Trà',      ARRAY['st','son tra','sơn trà','quận sơn trà'],               108.2480, 16.1000),
  ('NHS', 'Ngũ Hành Sơn', ARRAY['nhs','ngu hanh son','ngũ hành sơn','quận ngũ hành sơn'],108.2620, 16.0280),
  ('LC',  'Liên Chiểu',   ARRAY['lc','lien chieu','liên chiểu','quận liên chiểu'],      108.1440, 16.0830),
  ('CL',  'Cẩm Lệ',       ARRAY['cl','cam le','cẩm lệ','quận cẩm lệ'],                  108.1950, 16.0250)
) v(code, name, aliases, lng, lat)
ON CONFLICT (city_id, code) DO NOTHING;

-- ── 9. Wipe sample venue addresses (user confirmed sample data can be reset) ──
-- If you want to KEEP existing venue rows, comment out the next UPDATE block.
-- We null out old address fields so the frontend won't show stale data while
-- admins re-fill the new structured columns.
-- NOTE: FK columns (city_id, district_id) stay NULL until re-assigned.

-- (Intentionally NO UPDATE here — keeping old text fields viewable until drop.)

-- ── 10. Drop old flat columns ────────────────────────────────────
ALTER TABLE venue_schema.venues DROP COLUMN IF EXISTS address;
ALTER TABLE venue_schema.venues DROP COLUMN IF EXISTS city;
ALTER TABLE venue_schema.venues DROP COLUMN IF EXISTS district;
DROP INDEX IF EXISTS venue_schema.idx_venues_address_trgm;
