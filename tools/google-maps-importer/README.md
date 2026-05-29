# MyNook · Google Maps Importer (Userscript)

Tampermonkey userscript scrape data từ Google Maps place page (info + ảnh + reviews kèm ảnh) → upload Cloudinary → tạo draft import trong MyNook.

Mục tiêu: rút gọn flow nhập venue thủ công xuống còn 1 click trên Google Maps + 1 click confirm trong `/admin/imports`.

---

## Cách hoạt động (tóm tắt)

1. Bạn mở 1 trang Google Maps place (URL dạng `https://www.google.com/maps/place/...`)
2. Userscript inject panel **"📥 MyNook Importer"** ở góc phải trên
3. Bấm **Import to MyNook** → script:
   - Đọc DOM lấy: tên, địa chỉ, phone, website, rating, lat/lng, place_id
   - Click tab Ảnh → scroll → grab 10 URL ảnh CDN Google
   - Click tab Đánh giá → scroll → grab 8 review (rating + author + content + ảnh)
   - Download từng ảnh (qua `GM_xmlhttpRequest`, bypass CORS) → POST `/api/upload` → nhận URL Cloudinary
   - POST `/api/admin/imports/google-maps/drafts` với payload đầy đủ
4. Bạn vào `http://localhost:3000/admin/imports`, chọn draft vừa tạo, kiểm tra rồi bấm **Publish**

Toàn bộ ảnh đã nằm trên Cloudinary của bạn — không phụ thuộc URL Google.

---

## Cài đặt

### 1. Cài Tampermonkey

- Chrome: https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
- Edge / Firefox / Brave: search "Tampermonkey" trong store của browser

### 2. Cài userscript

Mở file [`mynook-importer.user.js`](./mynook-importer.user.js) trong VSCode → copy toàn bộ → trong Tampermonkey dashboard click **"+"** (Create new script) → paste → Ctrl+S.

Hoặc kéo-thả file `.user.js` vào tab Tampermonkey dashboard.

### 3. Khởi động backend

Userscript cần 3 services chạy:

```bash
npx nx serve api-gateway        # 3001
npx nx serve venue-service      # 3003
npx nx serve interaction-service # 3004
```

(Nếu chưa, cũng cần `npx nx dev web-client` để vào `/admin/imports` confirm draft.)

### 4. Đăng nhập để auto-sync JWT

Vào `http://localhost:3000` → đăng nhập với account có `type = admin`.

Userscript cũng `@match` localhost:3000 → khi page load nó tự đọc cookie `mynook_access_token` và lưu vào GM storage. Bạn sẽ thấy 1 badge xanh nhỏ ở góc phải dưới: **"✓ MyNook Importer ready"**.

→ **Không cần paste JWT thủ công** nữa. Mỗi lần JWT refresh (do interceptor axios), userscript tự pick up trong vòng 5s.

---

## Sử dụng

1. Login web-client (làm 1 lần) — badge xanh xuất hiện = đã sync token
2. Mở 1 trang Google Maps place, ví dụ `https://www.google.com/maps/place/Quan+An+Ngon/...`
3. Đợi 1-2s cho script inject panel ở góc phải trên
4. **Trước tiên bấm 🔍 Test** → mở F12 Console xem log `[MyNookImporter]`. Nếu thấy:
   - `harvestImages() trả về: 0 URL` → DOM Google không match selector → báo tôi log
   - `harvestImages() trả về: 30+ URL` → OK, sẵn sàng import
5. Bấm **Import to MyNook** → chạy luôn, không hỏi gì
6. Theo dõi status trong panel:
   ```
   Đọc thông tin venue…
   Mở tab ảnh + scroll…
   Lấy được 10 ảnh venue
   Mở tab reviews + scroll…
   Lấy được 8 reviews
   Tải ảnh từ Google (1-5/10)…
   Upload 5 ảnh lên Cloudinary…
   …
   ✅ Tạo draft xong! 10 ảnh venue + 8 reviews. Vào /admin/imports để confirm.
   ```
6. Mở `http://localhost:3000/admin/imports` → draft mới ở đầu danh sách → review + publish

Tổng thời gian: ~30-60s/venue tùy số ảnh + tốc độ mạng.

---

## Cấu hình mặc định

Sửa các hằng số ở đầu file [`mynook-importer.user.js`](./mynook-importer.user.js) nếu cần:

```js
const DEFAULTS = {
  apiBase: 'http://localhost:3001/api',
  maxVenuePhotos: 10,        // ảnh venue tối đa
  maxReviews: 8,             // review tối đa
  maxPhotosPerReview: 3,     // ảnh trong mỗi review
  photoSize: 1200,           // resize ảnh xuống 1200x1200
};
```

Reset config (token + apiBase): bấm icon **⚙** trong panel.

---

## Troubleshooting

| Triệu chứng | Nguyên nhân | Cách fix |
|------|------|------|
| Panel không hiện | Chưa vào `/maps/place/...` hoặc Tampermonkey tắt | Reload trang, check icon Tampermonkey active |
| `❌ Không tìm thấy tên venue` | Selector đổi (Google A/B test UI) | Reload trang, hoặc update selector trong `extractInfo()` |
| `Upload HTTP 401` | JWT hết hạn | Mở lại http://localhost:3000 → login lại → reload Google Maps page (script tự sync token mới) |
| Badge "⚠ đăng nhập để sync token" | Cookie `mynook_access_token` không có | Login lại web-client; nếu vẫn thiếu, F12 → Application → Cookies → kiểm tra cookie có tồn tại không |
| `Upload HTTP 403` | Account không phải admin | Đăng nhập account `type = admin` |
| `CORS error` trong console | Gateway chưa restart sau khi update CORS config | Restart `nx serve api-gateway` |
| `❌ Network error` khi upload | Backend chưa chạy hoặc port khác | Check `apiBase` config |
| Lấy 0 ảnh venue | Tab Ảnh không kịp load hoặc tab name khác | Mở DevTools Console xem log `[MyNookImporter]` — sẽ thấy "Tìm thấy X ảnh trong DOM". Nếu = 0 nghĩa là `harvestImages()` không match. Inspect element 1 ảnh trên trang xem thật sự nó có domain `googleusercontent.com` không |
| Lấy 0 ảnh menu | Place không có sub-tab "Menu" / "Thực đơn" trong photos | Bình thường — không phải mọi venue đều có. Vào `/admin/imports` paste URL ảnh menu thủ công vào field "Ảnh menu" |
| Lấy 0 review | Tab Đánh giá không tìm thấy hoặc cards không match `div[data-review-id]` | Check console log `Tìm thấy X review card`. Nếu = 0 thì Google đổi attribute, cần update selector |
| Reviews thiếu nội dung | Review dài bị truncate "...Thêm" | Script đã auto-click nút "Thêm", nếu vẫn miss thì kiểm tra `expandReviewMore()` |

---

## Cảnh báo

- **Google ToS**: scraping về kỹ thuật vi phạm. OK cho project sinh viên / portfolio. **Đừng deploy public + đừng scrape lượng lớn** (>50 venue/ngày sẽ bị Google flag IP).
- **Selector dễ vỡ**: Google update UI Maps thường xuyên. Khi script dừng làm việc, mở DevTools inspect lại class name DOM tương ứng.
- **JWT hết hạn**: Token MyNook có TTL. Khi gặp 401 thì reset config và lấy token mới.
- **Cloudinary free tier**: 25GB storage. 1 venue ~ 10 ảnh × 200KB = 2MB → ~12000 venue trước khi hết. Đủ thoải mái.
- **Random user seeding**: Reviews seed dùng random account thực trong DB → demo OK, **không production**.

---

## Khi UI Google Maps thay đổi

Các selector hay gãy nhất:
- `h1.DUwDvf` — tên place
- `button[data-item-id="address"]` — địa chỉ
- `div[data-review-id]` — review card
- `span.wiI7pd` — content review

Cách debug:
1. Mở DevTools trên trang Google Maps
2. Inspect element cần lấy
3. Tìm class/attribute ổn định nhất (tránh class hashed kiểu `.aBcD3eF`)
4. Update selector trong file `.user.js`
5. Save → reload trang Google Maps

---

## File trong folder này

- `mynook-importer.user.js` — userscript chính
- `README.md` — file này
