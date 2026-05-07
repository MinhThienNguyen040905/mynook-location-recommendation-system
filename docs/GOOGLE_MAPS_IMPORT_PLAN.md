# MyNook - Google Maps Import Pipeline Plan

> Muc tieu: khi nguoi dung chon mot dia diem tren Google Maps, he thong khong chi "seed" 1 row venue, ma tao ra mot **import/enrichment pipeline** day du de venue do co the vao luong search, recommendation, tag seeding va embedding nhu data thuong.

---

## 1. Muc tieu san pham

### Dau ra can dat
- Tao duoc venue tu Google Maps voi data day du: ten, dia chi, toa do, category, mo ta, gio mo cua, anh, website, so dien thoai.
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

### Huong de khuyen nghi
1. **Backend import core** trong `venue-service`
2. **Web import studio** trong `web-client`
3. **Chrome extension** lam tang toc capture sau khi MVP on dinh

### Ly do
- `venue-service` dang la owner cua city/district/category va create/update venue.
- `search-ai-service` chi nen nhan event sau khi venue da co du thong tin.
- `web-client` co san UI dashboard, form venue, map picker, category picker.
- Extension chi nen la lop capture, khong nen la source of truth.

---

## 3. Kien truc de xay

### Lop 1: Capture
- Nguoi dung mo Google Maps.
- Extension hoac web import page lay thong tin hien thi:
  - place name
  - place id
  - lat/lng
  - address
  - hours
  - phone
  - website
  - photos
  - rating/review count

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
| POST | `/api/imports/google-maps/drafts/:id/publish` | Tao venue chinh thuc |
| POST | `/api/imports/google-maps/drafts/:id/reject` | Tu choi draft |

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

### 6.6 Publish
Khi user bam publish:
- tao `venues`
- save categories
- save media
- save address/city/district/lat/lng
- goi:
  - `embeddingService.regenerateInBackground()`
  - `events.emitDescribed(VENUE_CREATED, ...)`

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
- auto-suggest category chips
- edit address/location
- publish / reject / save draft

### 7.2 Chinh flow UX
1. User paste Google Maps link.
2. He thong parse data va hien preview.
3. User chon category, sua ten, dia chi, mo ta.
4. User bam "Save draft" hoac "Publish".
5. Venue chay qua pipeline hien co.

### 7.3 Extension sau
Chrome extension chi can:
- doc place URL/place id
- gui ve import API
- mo popover nho de confirm

Khong can lam day du logic business trong extension.

---

## 8. Integration voi search/recommendation

### Bat buoc
- Sau publish, venue phai co `description` neu co the.
- `category_ids` phai duoc set.
- `city_id` va `district_id` phai co dung.
- `latitude` / `longitude` phai hop le.

### Nen co
- `opening_hours`
- `media`
- `menu_image_url`
- `rating_avg`/`review_count` ban dau neu co source

### Sau publish
- `VenueEmbeddingService` sinh embedding.
- `VenueEventsService` emit description event.
- `search-ai-service` seed tag tu description.
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

### Phase 5 - Extension
- Capture current place
- send to backend
- open draft in web app

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
- `apps/api-gateway/src/app/modules/...`

### Search side
- `apps/search-ai-service/src/app/modules/description-tagging/*`
- `apps/search-ai-service/src/app/modules/search/location-resolver.service.ts`
- `apps/search-ai-service/src/app/modules/search/category-tag-provider.service.ts`

### Frontend
- `apps/web-client/src/app/(admin)/admin/imports/page.tsx`
- `apps/web-client/src/components/...`
- `apps/web-client/src/lib/api/...`

### Shared types
- `libs/shared-types/src/lib/shared-types.ts`
- `libs/database/src/lib/entities/*`

---

## 11. Acceptance criteria

He thong duoc xem la xong khi:
- Import mot place tu Google Maps co the tao draft.
- Draft co the duoc review va publish.
- Publish tao venue moi co embed + category + location dung.
- Venue moi co the xuat hien trong search va recommendation nhu venue thuong.
- Duplicate gan dung bi canh bao hoac bi chan.
- Co log/trace de biet import nao bi loi.

---

## 12. Risk va luu y

- Phai can nhac Terms of Service cua Google Maps/Google Places.
- Khong nen phu thuoc vao scraping mong manh neu co the dung Places API.
- Extension chi nen la tool capture, khong nen la noi xu ly business.
- Neu data source thieu description, search quality se kem neu khong enrich.
- Neu import qua nhanh ma khong co dedup, search se bi reu.

---

## 13. MVP goi y

Neu can lam nhanh nhat:
1. Web import page truoc.
2. Cho paste URL/place id.
3. Tao draft + map preview.
4. User chinh category/location/description.
5. Publish sang flow venue hien co.

Day la phien ban it rui ro nhat va de gan vao search pipeline nhat.
