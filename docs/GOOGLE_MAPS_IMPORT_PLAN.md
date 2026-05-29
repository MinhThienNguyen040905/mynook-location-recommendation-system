# MyNook - Google Maps Import Pipeline Plan

> Muc tieu: khi nguoi dung chon mot dia diem tren Google Maps, he thong khong chi "seed" 1 row venue, ma tao ra mot **import/enrichment pipeline** day du de venue do co the vao luong search, recommendation, tag seeding va embedding nhu data thuong.

---

## 1. Muc tieu san pham

### Dau ra can dat
- Tao duoc venue tu Google Maps voi data day du: ten, dia chi, toa do, category, mo ta, gio mo cua, anh, website, so dien thoai.
- Co the import them review snippets / rating / review count tu Google Maps de lam cold start.
- Venue moi sau khi import phai di qua dung pipeline hien co:
  - sinh embedding
  - seed tag tu mo ta
  - gan city/district dung FK
  - co the xuat hien trong search/recommendation
- Co co che review/duyet truoc khi publish, tranh duplicate va spam data.

### Khong phai muc tieu
- Khong chi nham chep raw data tu Maps vao DB.
- Khong bo qua pipeline search-ai-service.
- Khong push venue "banh xe" vao search chinh khi chua co category/geo/description toi thieu.

---

## 2. Chon huong trien khai

### Huong de khuyen nghi (final)
1. **Backend import core** trong `venue-service` — owner cua draft + publish flow
2. **Internal seed endpoint** trong `interaction-service` — random user + emit `venue.reviewed`
3. **Tampermonkey userscript** o `tools/google-maps-importer/` — capture data tu Google Maps page
4. **Web import studio** o `/admin/imports` trong `web-client` — review/sua/publish draft

### Ly do
- `venue-service` dang la owner cua city/district/category va create/update venue.
- `search-ai-service` chi nen nhan event sau khi venue da co du thong tin.
- `web-client` co san UI dashboard, form venue, map picker, category picker.
- **Userscript** thay vi Chrome extension vi: free, khong can publish, chay trong session browser that nen Google kho phat hien, install bang Tampermonkey 1 click.
- **Khong dung Google Places API** vi tinh phi (~$17/1000 request Place Details). Userscript scrape DOM la solution mien phi cho project sinh vien.

---

## 3. Kien truc de xay

### Lop 1: Capture (Tampermonkey userscript)
File: `tools/google-maps-importer/mynook-importer.user.js`

- Nguoi dung mo trang Google Maps place trong Chrome (da cai Tampermonkey + userscript).
- Userscript inject panel "📥 MyNook Importer" o goc phai tren.
- Khi user bam **Import to MyNook**, script:
  - Doc DOM lay: name, place_id, lat/lng (parse tu URL), address, phone, website, rating, review count
  - Click tab Anh → scroll → grab tu URL CDN googleusercontent.com (resize ve 1200px)
  - Click tab Danh gia → scroll → grab cards: rating, author, content, anh review (max 3/review)
  - Download tung anh qua `GM_xmlhttpRequest` (bypass CORS) → POST `/api/upload` → nhan URL Cloudinary
  - POST `/api/admin/imports/google-maps/drafts` voi normalized_payload day du (info + media[] cua venue + selected_reviews[] kem media[])
- Selectors quan trong (de update khi Google doi UI):
  - `h1.DUwDvf` — name
  - `button[data-item-id="address"]` — address
  - `div.F7nice` — rating + review count
  - `a[data-photo-index]` — photo grid
  - `div[data-review-id]` — review card
  - `span.wiI7pd` — review content

### Lop 2: Normalize
- Chuan hoa du lieu raw thanh draft venue.
- Giai quyet:
  - city_id / district_id
  - category_ids / primary_category_id
  - branch_name neu co
  - description ban dau

### Lop 3: Enrich
- Neu description trong qua it:
  - tao short description tu raw fields
- Gan category goi y tu taxonomy hien co.
- Chon top review snippets de seed thanh review noi bo cua he thong.
- Tao search_document + embedding.
- Emit event seed tag tu description.

### Lop 4: Publish
- User duyet draft.
- He thong goi vao flow create venue hien co.
- Venue duoc index vao search/recommendation nhu venue binh thuong.

---

## 4. Data model de can nhac

### Option A - them bang import queue
Phu hop neu muon review truoc khi publish.

#### `venue_schema.venue_imports`
- `id`
- `source` = `google_maps`
- `source_place_id`
- `source_url`
- `raw_payload` JSONB
- `normalized_payload` JSONB
- `status` = `draft | enriched | ready | published | rejected | duplicate`
- `matched_venue_id` nullable
- `confidence` numeric
- `created_by`
- `created_at`
- `updated_at`

#### Review seed metadata optional
Voi demo/do an mon hoc, review Google Maps se duoc seed truc tiep vao `interaction_schema.reviews` nhu review that cua user trong he thong.

Neu muon trace lai nguon import de debug, co the them bang phu optional:

#### `venue_schema.venue_import_review_sources`
- `id`
- `venue_import_id`
- `review_id`
- `source` = `google_maps`
- `source_review_id` nullable
- `raw_payload` JSONB
- `created_at`

Bang nay chi de audit/debug noi bo; UI va luong san pham van doc review tu `interaction_schema.reviews`.

### Option B - them cot vao venue
Phu hop neu muon nhanh, nhung kem an toan hon.

- `source`
- `source_place_id`
- `source_url`
- `import_status`
- `import_payload`

### Khuyen nghi
- Dung **Option A**.
- Chi khi publish moi tao row trong `venues`.

---

## 5. Backend API can co

### Nhom API import
De dat trong `api-gateway`, forward sang `venue-service`.

| Method | Path | Muc dich |
|---|---|---|
| POST | `/api/imports/google-maps/resolve` | Nhan place id/url, tra ve raw data da parse |
| POST | `/api/imports/google-maps/drafts` | Tao draft import |
| GET | `/api/imports/google-maps/drafts` | List draft imports |
| GET | `/api/imports/google-maps/drafts/:id` | Xem chi tiet draft |
| PATCH | `/api/imports/google-maps/drafts/:id` | Chinh sua normalized data |
| POST | `/api/imports/google-maps/drafts/:id/enrich` | Goi enrichment pipeline |
| POST | `/api/imports/google-maps/drafts/:id/import-reviews` | Seed review snippets Google Maps vao review noi bo voi random user |
| POST | `/api/imports/google-maps/drafts/:id/publish` | Tao venue chinh thuc |
| POST | `/api/imports/google-maps/drafts/:id/reject` | Tu choi draft |

### Nhom API noi bo cho seeded reviews
Phan insert review nen nam o `interaction-service`, vi service nay dang own `interaction_schema.reviews` va emit `venue.reviewed`.

| Method | Path | Muc dich |
|---|---|---|
| POST | `/reviews/seed/google-maps` | Internal endpoint nhan `{ venue_id, reviews[] }`, random account that, tao reviews va emit events |

### Nhom API ho tro
- `GET /api/categories`
- `GET /api/cities`
- `GET /api/districts?city_id=...`
- `GET /api/admin/cities`
- `GET /api/admin/districts`

---

## 6. Logic backend chi tiet

### 6.1 Resolve raw place
- Input co the la:
  - Google Maps URL
  - place id
  - pasted name + address
- Backend tra ve:
  - canonical name
  - address components
  - lat/lng
  - place metadata

### 6.2 Dedup detection
Truoc khi tao draft:
- so sanh place_id neu da co
- so sanh fuzzy:
  - name
  - address_line
  - lat/lng gan
  - district/city
- neu match cao:
  - return existing venue hoac mark duplicate draft

### 6.3 Normalize location
Reuse dung he thong hien co:
- city/district FK
- aliases
- LocationResolverService

### 6.4 Suggest categories
Dung:
- category key/synonym
- venue name
- place type
- description raw
- nearby context

Output:
- `category_ids`
- `primary_category_id`
- `confidence`

### 6.5 Generate description ban dau
Neu Google Maps data qua it:
- tao mo ta ngan 2-4 cau
- chi mo ta thong tin quan sat duoc
- khong them claim khong co trong raw data

### 6.6 Seed Google Maps reviews thanh review noi bo
Vi day la do an/demo, review lay tu Google Maps se duoc seed vao `interaction_schema.reviews` nhu review that cua user.

Flow de seed:
- Lay top N review snippets co chat luong tot nhat (userscript da grab san khi capture).
- Random `account_id` tu account that dang active trong he thong.
- Mac dinh random account active co type `customer`/`owner`; neu muon demo don gian thi co the random bat ky account active nao.
- Tao review voi:
  - `venue_id` = venue vua publish
  - `account_id` = random user
  - `rating` = rating cua Google review
  - `content` = text review tu Google Maps
  - `media` = mang URL Cloudinary cua anh trong review (userscript da upload truoc khi tao draft)
  - `is_verified_visit` = false
- Emit `venue.reviewed` cho tung review de `search-ai-service` phan tich AI va upsert `venue_tags`.
- Recalculate `venue_schema.venues.rating_avg` va `review_count` sau khi seed xong.
- Optional: luu mapping `review_id` -> raw Google review vao `venue_import_review_sources` de debug.

> **Implementation note (2026-05):** `SeedGoogleMapsReviewInput` trong `interaction-service` da co field `media?: string[]`. `GoogleMapsReviewSnippet` trong `venue-service` cung da co field `media?: string[]`. Ca `normalizeReviews()` va `seedReviews()` deu forward field nay nguyen ven.

### 6.7 Publish
Khi user bam publish:
- tao `venues`
- save categories
- save media
- save address/city/district/lat/lng
- goi:
  - `embeddingService.regenerateInBackground()`
  - `events.emitDescribed(VENUE_CREATED, ...)`
- neu draft co selected review snippets:
  - goi luong seed reviews qua `interaction-service`
  - gan random user that cho tung review
  - emit `venue.reviewed` de search-ai-service seed tags tu noi dung review
  - recalculate `rating_avg` va `review_count` tu `interaction_schema.reviews`

---

## 7. Frontend plan

### 7.1 Web import studio
De them 1 trang:
- `/admin/imports`

UI can co:
- input paste Google Maps URL
- input place id
- list draft items
- detail drawer/side panel
- preview map
- tab Reviews de xem / chon snippets seeding vao review noi bo
- auto-suggest category chips
- edit address/location
- publish / reject / save draft

### 7.2 Chinh flow UX
1. User paste Google Maps link.
2. He thong parse data va hien preview.
3. User chon review snippets muon seed.
4. User chon category, sua ten, dia chi, mo ta.
5. User bam "Save draft" hoac "Publish".
6. Venue chay qua pipeline hien co, review snippets duoc gan random user that.

### 7.3 Tampermonkey userscript (DA TRIEN KHAI)
Thay vi Chrome extension, dung Tampermonkey userscript — don gian va free hoan toan.

File: `tools/google-maps-importer/mynook-importer.user.js`

Userscript chi can:
- Doc place URL/place id + DOM info + photos + reviews
- Upload anh qua `/api/upload` (Cloudinary)
- POST draft sang `/api/admin/imports/google-maps/drafts`

Config qua `GM_setValue`:
- `mynook_jwt` — JWT cua admin (lay tu localStorage cua web-client)
- `mynook_api_base` — mac dinh `http://localhost:3001/api`

CORS: `apps/api-gateway/src/main.ts` allow origin pattern `https://(www\.)?google\.[a-z.]+` de userscript fetch duoc tu Google Maps page.

Khong can lam day du logic business trong userscript — chi capture + upload + tao draft. Toan bo enrichment/dedup/publish van o backend.

---

## 8. Integration voi search/recommendation

### Bat buoc
- Sau publish, venue phai co `description` neu co the.
- `category_ids` phai duoc set.
- `city_id` va `district_id` phai co dung.
- `latitude` / `longitude` phai hop le.
- Neu co Google Maps reviews thi seed vao `interaction_schema.reviews` voi random user that de phuc vu demo.

### Nen co
- `opening_hours`
- `media`
- `menu_image_url`
- `rating_avg`/`review_count` duoc recalculate tu seeded reviews sau publish
- `venue_import_review_sources` neu muon trace lai raw Google review

### Sau publish
- `VenueEmbeddingService` sinh embedding.
- `VenueEventsService` emit description event.
- `search-ai-service` seed tag tu description.
- Seeded Google Maps reviews emit `venue.reviewed`, nen `search-ai-service` se xu ly nhu review that va cap nhat `venue_tags`.
- venue co the tham gia search hybrid va recommendation sau khi co signal.

---

## 9. Thu tu implementation de khong bi lo

### Phase 0 - Chot scope
- Chon MCP hay data source hop le.
- Xac dinh co dung Google Places API khong.
- Xac dinh co cho phep import tu user pasted URL khong.

### Phase 1 - Core data model
- Them import table hoac import status.
- Them DTOs va entity.
- Them migration.

### Phase 2 - Backend import service
- Resolve
- Normalize
- Dedup
- Draft CRUD
- Publish action
- Seed Google Maps reviews vao `interaction_schema.reviews`
- Internal seed endpoint trong `interaction-service` de random user va emit `venue.reviewed`

### Phase 3 - Web import studio
- Trang admin import
- draft list
- draft detail
- category suggestion
- location picker

### Phase 4 - Enrichment
- Auto description
- category scoring
- duplicate warning
- completeness scoring
- review snippet selection + random user assignment

### Phase 5 - Tampermonkey userscript (DONE)
- `tools/google-maps-importer/mynook-importer.user.js` — capture + upload + create draft
- `tools/google-maps-importer/README.md` — install + usage guide
- CORS update trong `apps/api-gateway/src/main.ts` cho phep origin Google Maps
- `media[]` field forwarded qua toan bo flow: userscript → /upload → draft → seed reviews

### Phase 6 - QA
- test search behavior
- test embedding generation
- test description tag seeding
- test duplicate handling
- test publish/reject flow

---

## 10. Files likely to touch

### Backend
- `apps/venue-service/src/app/modules/location/location.service.ts`
- `apps/venue-service/src/app/modules/category/category.service.ts`
- `apps/venue-service/src/app/modules/venue/venue.service.ts`
- `apps/venue-service/src/app/modules/venue/embedding.service.ts`
- `apps/venue-service/src/app/modules/venue/venue-events.service.ts`
- `apps/venue-service/src/app/modules/admin/admin.service.ts`
- `apps/interaction-service/src/app/modules/review/review.service.ts`
- `apps/api-gateway/src/app/modules/...`

### Search side
- `apps/search-ai-service/src/app/modules/description-tagging/*`
- `apps/search-ai-service/src/app/modules/search/location-resolver.service.ts`
- `apps/search-ai-service/src/app/modules/search/category-tag-provider.service.ts`

### Frontend
- `apps/web-client/src/app/(admin)/admin/imports/page.tsx`
- `apps/web-client/src/components/...`
- `apps/web-client/src/lib/api/...`

### Userscript (capture layer)
- `tools/google-maps-importer/mynook-importer.user.js`
- `tools/google-maps-importer/README.md`

### Shared types
- `libs/shared-types/src/lib/shared-types.ts`
- `libs/database/src/lib/entities/*`

---

## 11. Acceptance criteria

He thong duoc xem la xong khi:
- Import mot place tu Google Maps co the tao draft.
- Draft co the duoc review va publish.
- Co the seed review snippets Google Maps vao `interaction_schema.reviews` voi random user that.
- Moi seeded review emit `venue.reviewed` de search-ai-service tao tag nhu review that.
- Publish tao venue moi co embed + category + location dung.
- Venue moi co the xuat hien trong search va recommendation nhu venue thuong.
- Duplicate gan dung bi canh bao hoac bi chan.
- Co log/trace de biet import nao bi loi.

---

## 12. Risk va luu y

- Phai can nhac Terms of Service cua Google Maps/Google Places. Userscript scraping ve ky thuat vi pham ToS — chi dung cho demo/project sinh vien, khong deploy public va khong scrape >50 venue/ngay (Google flag IP).
- Selectors DOM Google Maps thuong xuyen doi (A/B test). Khi userscript dung lam viec → mo DevTools inspect lai class name va update file `.user.js`.
- Userscript va extension chi la tool capture, khong nen la noi xu ly business — toan bo enrichment/dedup van phai o backend.
- Neu data source thieu description, search quality se kem neu khong enrich.
- Neu import qua nhanh ma khong co dedup, search se bi reu.
- Che do random user that cho Google Maps reviews chi nen dung cho demo/do an mon hoc, khong dung cho product thuc te.
- JWT cua admin store trong `GM_setValue` cua Tampermonkey — trong Tampermonkey isolated storage, chi accessible boi userscript day. Khi het han phai reset bang nut ⚙ trong panel.
- Anh tu Google download qua `GM_xmlhttpRequest` (browser session that) → upload Cloudinary cua project → URL ben vung, khong phu thuoc Google CDN nua.

---

## 13. MVP goi y

Neu can lam nhanh nhat:
1. Web import page truoc.
2. Cho paste URL/place id.
3. Tao draft + map preview.
4. Review tab de chon snippets seeding vao review noi bo.
5. User chinh category/location/description.
6. Publish sang flow venue hien co va random user that cho moi review snippet.

Day la phien ban it rui ro nhat va de gan vao search pipeline nhat.
