// ==UserScript==
// @name         MyNook · Google Maps Importer
// @namespace    https://mynook.local/
// @version      0.2.0
// @description  Quét data từ Google Maps place page (info + ảnh + reviews) và đẩy thành draft import vào MyNook
// @match        https://www.google.com/maps/*
// @match        https://www.google.com/maps
// @match        http://localhost:3000/*
// @match        http://127.0.0.1:3000/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      lh3.googleusercontent.com
// @connect      lh4.googleusercontent.com
// @connect      lh5.googleusercontent.com
// @connect      lh6.googleusercontent.com
// @connect      streetviewpixels-pa.googleapis.com
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ---- Config -------------------------------------------------------------
  const DEFAULTS = {
    apiBase: 'http://localhost:3001/api',
    maxVenuePhotos: 10,
    maxReviews: 8,
    maxPhotosPerReview: 3,
    photoSize: 1200, // resize URLs to wXXX-hXXX
  };

  const STORAGE_KEY_TOKEN = 'mynook_jwt';
  const STORAGE_KEY_API = 'mynook_api_base';
  const WEB_CLIENT_COOKIE_KEY = 'mynook_access_token';

  const isWebClient = /^(http:\/\/(localhost|127\.0\.0\.1):3000)/.test(location.origin);
  const isGoogleMaps = /^https:\/\/www\.google\.com\/maps/.test(location.origin + location.pathname);

  // ---- Tiny helpers -------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = (...args) => console.log('[MyNookImporter]', ...args);
  const warn = (...args) => console.warn('[MyNookImporter]', ...args);

  function getApiBase() {
    return GM_getValue(STORAGE_KEY_API, DEFAULTS.apiBase);
  }
  function getToken() {
    return GM_getValue(STORAGE_KEY_TOKEN, '');
  }

  function ensureConfig() {
    if (!getToken()) {
      const t = prompt(
        'Chưa có JWT.\n' +
          'Cách dễ nhất: mở http://localhost:3000 và đăng nhập admin — userscript sẽ tự lấy token.\n' +
          'Hoặc paste token thủ công vào đây:',
      );
      if (!t) return false;
      GM_setValue(STORAGE_KEY_TOKEN, t.trim());
    }
    if (!GM_getValue(STORAGE_KEY_API, '')) {
      GM_setValue(STORAGE_KEY_API, DEFAULTS.apiBase);
    }
    return true;
  }

  // Read cookie value by name (web-client only)
  function readCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  // When script runs on web-client, sync the JWT cookie into GM storage
  // so it's available to the script when it next runs on Google Maps.
  function syncTokenFromWebClient() {
    const token = readCookie(WEB_CLIENT_COOKIE_KEY);
    if (!token) return false;
    const existing = GM_getValue(STORAGE_KEY_TOKEN, '');
    if (existing === token) return true;
    GM_setValue(STORAGE_KEY_TOKEN, token);
    GM_setValue(STORAGE_KEY_API, GM_getValue(STORAGE_KEY_API, '') || DEFAULTS.apiBase);
    log('Đã sync JWT từ cookie web-client');
    return true;
  }

  function resetConfig() {
    GM_deleteValue(STORAGE_KEY_TOKEN);
    GM_deleteValue(STORAGE_KEY_API);
    toast('Đã reset config — bấm Import lại để nhập mới');
  }

  // ---- DOM extractors -----------------------------------------------------
  function $(sel, root = document) {
    return root.querySelector(sel);
  }
  function $$(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function getText(el) {
    return el ? el.textContent.trim() : '';
  }

  function pickFirstText(selectors, root = document) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return '';
  }

  function extractLatLngFromUrl() {
    const m1 = location.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m1) return { latitude: parseFloat(m1[1]), longitude: parseFloat(m1[2]) };
    const m2 = location.href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (m2) return { latitude: parseFloat(m2[1]), longitude: parseFloat(m2[2]) };
    return { latitude: null, longitude: null };
  }

  function extractPlaceIdFromUrl() {
    const m = location.href.match(/!1s([0-9a-fx:]+)/i);
    return m ? m[1] : null;
  }

  // Resize Google CDN photo URL to wW-hH
  function upsizePhotoUrl(url, size) {
    if (!url) return url;
    return url.replace(/=w\d+-h\d+(-[a-zA-Z-]+)?$/, `=w${size}-h${size}-k-no`)
              .replace(/=s\d+(-[a-zA-Z-]+)?$/, `=s${size}-k-no`);
  }

  // Pull background-image URL from a style attr
  function bgUrl(el) {
    if (!el) return null;
    const style = el.getAttribute('style') || el.style?.backgroundImage || '';
    const m = style.match(/url\((['"]?)(https?:\/\/[^)'"]+)\1\)/);
    return m ? m[2] : null;
  }

  function extractInfo() {
    const name = pickFirstText([
      'h1.DUwDvf',
      '[role="main"] h1',
    ]);

    const address = pickFirstText([
      'button[data-item-id="address"] div.fontBodyMedium',
      'button[data-item-id="address"]',
    ]);

    const phone = pickFirstText([
      'button[data-item-id^="phone"] div.fontBodyMedium',
      'button[data-item-id^="phone"]',
    ]);

    const websiteEl = $('a[data-item-id="authority"]');
    const website = websiteEl ? websiteEl.href : '';

    const ratingText = pickFirstText([
      'div.F7nice span[aria-hidden="true"]',
      'div.F7nice span',
    ]);
    const rating = parseFloat(ratingText.replace(',', '.')) || null;

    const reviewCountText = pickFirstText([
      'div.F7nice span[aria-label*="bài đánh giá"]',
      'div.F7nice span[aria-label*="review"]',
      'div.F7nice button[aria-label*="bài đánh giá"]',
    ]);
    const reviewCountMatch = reviewCountText.match(/[\d.,]+/);
    const reviewCount = reviewCountMatch
      ? parseInt(reviewCountMatch[0].replace(/[.,]/g, ''), 10)
      : null;

    const { latitude, longitude } = extractLatLngFromUrl();

    return {
      name,
      address_line: address,
      phone_number: phone,
      website,
      rating_avg: rating,
      review_count: reviewCount,
      latitude,
      longitude,
      source_url: location.href,
      source_place_id: extractPlaceIdFromUrl(),
    };
  }

  // ---- Tab navigation -----------------------------------------------------
  function findTabButton(labelKeywords) {
    // Tabs in current Google Maps may be button/role=tab OR div with aria-label
    const candidates = [
      ...$$('button[role="tab"]'),
      ...$$('div[role="tab"]'),
      ...$$('button[aria-label]'),
      ...$$('a[aria-label]'),
    ];
    for (const t of candidates) {
      const text = (t.getAttribute('aria-label') || t.textContent || '').toLowerCase().trim();
      if (!text) continue;
      if (labelKeywords.some((k) => text.includes(k.toLowerCase()))) return t;
    }
    return null;
  }

  async function clickTab(keywords) {
    const btn = findTabButton(keywords);
    if (!btn) {
      log(`Không tìm thấy tab cho keywords: ${keywords.join(', ')}`);
      return false;
    }
    log(`Click tab: "${(btn.getAttribute('aria-label') || btn.textContent || '').trim().slice(0, 50)}"`);
    btn.click();
    await sleep(1500);
    return true;
  }

  // Find ALL scrollable side panels (Google Maps has many nested scrollers)
  function findScrollContainers() {
    const main = $('div[role="main"]') || document.body;
    const set = new Set([main]);
    main.querySelectorAll(
      'div[tabindex="-1"], div[role="region"], div[role="feed"], div.m6QErb, div.DxyBCb, div[jslog]',
    ).forEach((el) => {
      // only count truly scrollable (overflow + content > visible)
      try {
        const cs = window.getComputedStyle(el);
        if (
          (cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 5
        ) {
          set.add(el);
        }
      } catch { /* ignore */ }
    });
    return Array.from(set);
  }

  async function scrollFeed(times = 8, delayMs = 600) {
    const containers = findScrollContainers();
    log(`Scroll: tìm thấy ${containers.length} container scrollable`);
    for (let i = 0; i < times; i++) {
      containers.forEach((c) => {
        try {
          c.scrollBy(0, 2000);
          c.scrollTop = (c.scrollTop || 0) + 2000;
        } catch { /* ignore */ }
      });
      // Force last visible photo tile into view to trigger virtualization
      const lastTile = $$('a[data-photo-index], button[jsaction*="photo"], [role="img"][style*="background-image"]').pop();
      if (lastTile) {
        try { lastTile.scrollIntoView({ block: 'end' }); } catch { /* ignore */ }
      }
      await sleep(delayMs);
    }
  }

  // ---- Photo extraction (robust) -----------------------------------------

  // Pull every plausible Google CDN URL from an element's attributes
  function urlsFromElement(el) {
    const out = [];
    if (!el) return out;
    const attrs = ['src', 'data-src', 'data-image-url', 'data-thumbnail', 'data-large-image-url'];
    for (const a of attrs) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && (v.includes('googleusercontent.com') || v.includes('streetviewpixels'))) {
        out.push(v);
      }
    }
    // srcset: "url 1x, url 2x"
    const srcset = el.getAttribute && el.getAttribute('srcset');
    if (srcset) {
      srcset.split(',').forEach((part) => {
        const url = part.trim().split(/\s+/)[0];
        if (url && (url.includes('googleusercontent.com') || url.includes('streetviewpixels'))) {
          out.push(url);
        }
      });
    }
    // currentSrc (modern browsers)
    if (el.currentSrc && (el.currentSrc.includes('googleusercontent.com') || el.currentSrc.includes('streetviewpixels'))) {
      out.push(el.currentSrc);
    }
    return out;
  }

  // Get every Google CDN image currently in the DOM
  function harvestImages({ container = document } = {}) {
    const out = new Set();

    // Strategy 1: <img> tags
    container.querySelectorAll('img').forEach((img) => {
      urlsFromElement(img).forEach((url) => {
        if (/=s\d{1,2}-c/.test(url)) return; // skip small avatars
        // Skip natural width < 80 (likely avatar) — but only if naturalWidth is reliable
        const w = img.naturalWidth || 0;
        if (w > 0 && w < 80) return;
        out.add(upsizePhotoUrl(url, DEFAULTS.photoSize));
      });
    });

    // Strategy 2: any element with inline background-image
    container.querySelectorAll('[style*="background-image"]').forEach((el) => {
      const u = bgUrl(el);
      if (!u) return;
      if (!u.includes('googleusercontent.com') && !u.includes('streetviewpixels')) return;
      if (/=s\d{1,2}-c/.test(u)) return;
      out.add(upsizePhotoUrl(u, DEFAULTS.photoSize));
    });

    // Strategy 3: photo tile buttons/anchors that may not have inline style yet
    container.querySelectorAll('a[data-photo-index], button[jsaction*="photo"]').forEach((el) => {
      // their inner divs often hold the bg image
      el.querySelectorAll('[style*="background-image"], img').forEach((inner) => {
        const u = bgUrl(inner) || inner.src;
        if (!u) return;
        if (!u.includes('googleusercontent.com') && !u.includes('streetviewpixels')) return;
        if (/=s\d{1,2}-c/.test(u)) return;
        out.add(upsizePhotoUrl(u, DEFAULTS.photoSize));
      });
    });

    return out;
  }

  // Diagnostic: dump everything we find to console for debugging
  function diagnose() {
    log('=== DIAGNOSE START ===');
    const allImgs = $$('img').filter((i) => i.src && i.src.includes('googleusercontent.com'));
    const allBgs = $$('[style*="background-image"]').filter((el) => {
      const u = bgUrl(el);
      return u && u.includes('googleusercontent.com');
    });
    log(`<img> với googleusercontent: ${allImgs.length}`);
    log(`bg-image với googleusercontent: ${allBgs.length}`);
    log(`a[data-photo-index]: ${$$('a[data-photo-index]').length}`);
    log(`button[jsaction*="photo"]: ${$$('button[jsaction*="photo"]').length}`);
    log(`div[data-review-id]: ${$$('div[data-review-id]').length}`);
    log(`Tabs found:`, $$('button[role="tab"], div[role="tab"]').map((t) => t.textContent.trim().slice(0, 30)));
    log(`Scroll containers:`, findScrollContainers().length);
    const harvested = harvestImages();
    log(`harvestImages() trả về: ${harvested.size} URL`);
    if (harvested.size > 0) {
      log('Sample URLs:', Array.from(harvested).slice(0, 3));
    }
    log('=== DIAGNOSE END ===');
    return harvested.size;
  }

  async function extractVenuePhotos(max) {
    // First harvest from current page (some hero/header images already loaded)
    const beforeTab = harvestImages();
    log(`Trước khi click tab Ảnh: thấy ${beforeTab.size} ảnh trong DOM`);

    // Try multiple keyword variants — Google Maps i18n changes
    const ok = await clickTab(['ảnh', 'photo', 'photos', 'hình']);
    if (!ok) {
      log('Bỏ qua tab Ảnh — dùng ảnh đã thấy trên hero');
      return Array.from(beforeTab).slice(0, max);
    }

    // Wait for photos to load + scroll to trigger lazy load
    await sleep(2000);
    await scrollFeed(6, 700);
    await sleep(800);

    const urls = harvestImages();
    log(`Sau khi mở tab Ảnh + scroll: thấy ${urls.size} ảnh`);

    // Merge with hero shots
    beforeTab.forEach((u) => urls.add(u));

    return Array.from(urls).slice(0, max);
  }

  // Try to extract a menu image. Google Maps may show photos categorized as
  // "Menu" / "Thực đơn" inside the photos tab. We look for that sub-tab/chip,
  // click it, harvest, then return first match. Returns null if not found.
  async function extractMenuImage() {
    // Sub-categories use chip-like buttons, not role=tab. Search broadly.
    const chips = $$('button, div[role="button"]').filter((el) => {
      const text = (el.textContent || '').trim().toLowerCase();
      return text === 'menu' || text === 'thực đơn' || text === 'thuc don';
    });
    if (chips.length === 0) {
      log('Không thấy chip Menu trong photos tab');
      return null;
    }
    log(`Click chip menu: "${chips[0].textContent.trim()}"`);
    chips[0].click();
    await sleep(1500);
    await scrollFeed(3, 500);
    const urls = harvestImages();
    if (urls.size === 0) {
      log('Menu chip clicked nhưng harvestImages = 0');
      return null;
    }
    const first = Array.from(urls)[0];
    log(`Menu image: ${first.slice(0, 80)}…`);
    return first;
  }

  // ---- Review extraction --------------------------------------------------
  function parseRatingFromAriaLabel(label) {
    if (!label) return 5;
    const m = label.match(/(\d)([.,]\d)?\s*(sao|star)/i) || label.match(/^(\d)([.,]\d)?/);
    if (m) return Math.max(1, Math.min(5, parseInt(m[1], 10)));
    return 5;
  }

  async function expandReviewMore(reviewEl) {
    const moreBtn = reviewEl.querySelector('button[aria-label*="Thêm"], button[aria-label*="More"], button.w8nwRe');
    if (moreBtn) {
      moreBtn.click();
      await sleep(120);
    }
  }

  async function extractReviews(maxReviews, maxPhotosPerReview) {
    const ok = await clickTab(['đánh giá', 'review', 'reviews', 'bài đánh giá']);
    if (!ok) {
      log('Không tìm thấy tab reviews');
      return [];
    }
    await sleep(1500);
    await scrollFeed(8, 700);
    await sleep(500);

    const cards = $$('div[data-review-id]');
    log(`Tìm thấy ${cards.length} review card trong DOM`);
    const out = [];
    for (const card of cards.slice(0, maxReviews)) {
      await expandReviewMore(card);

      const reviewId = card.getAttribute('data-review-id');
      const author = pickFirstText(['button div.d4r55', 'div.d4r55', 'a[href*="/contrib/"]'], card);
      const ratingEl = card.querySelector('span[role="img"][aria-label]');
      const rating = parseRatingFromAriaLabel(ratingEl?.getAttribute('aria-label'));
      const content = pickFirstText(['span.wiI7pd', 'div.MyEned span', 'span[jsname]'], card);
      const publishedAt = pickFirstText(['span.rsqaWe', 'span.xRkPPb'], card);

      if (!content) {
        log(`Skip review (không có content): ${reviewId}`);
        continue;
      }

      // Use harvestImages scoped to this card — picks up both <img> and bg-image
      const photoSet = harvestImages({ container: card });
      const photoUrls = Array.from(photoSet).slice(0, maxPhotosPerReview);

      out.push({
        source_review_id: reviewId,
        author_name: author || null,
        rating,
        content,
        published_at: publishedAt || null,
        _photo_urls: photoUrls,
      });
    }
    return out;
  }

  // ---- Image download + Cloudinary upload --------------------------------
  function downloadAsBlob(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'blob',
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) resolve(res.response);
          else reject(new Error(`HTTP ${res.status} for ${url}`));
        },
        onerror: () => reject(new Error(`Network error for ${url}`)),
      });
    });
  }

  function uploadToBackend(blobs) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      blobs.forEach((blob, i) => {
        const ext = blob.type.split('/')[1] || 'jpg';
        fd.append('files', blob, `gmaps-${Date.now()}-${i}.${ext}`);
      });
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${getApiBase()}/upload`,
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        data: fd,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            try {
              const data = JSON.parse(res.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error('Upload trả về không phải JSON: ' + res.responseText.slice(0, 200)));
            }
          } else {
            reject(new Error(`Upload HTTP ${res.status}: ${res.responseText.slice(0, 200)}`));
          }
        },
        onerror: () => reject(new Error('Network error khi upload')),
      });
    });
  }

  async function uploadUrlsInBatches(urls) {
    if (urls.length === 0) return [];
    const out = [];
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      setStatus(`Tải ảnh từ Google (${i + 1}-${Math.min(i + batch.length, urls.length)}/${urls.length})…`);
      const blobs = [];
      for (const url of batch) {
        try {
          const blob = await downloadAsBlob(url);
          blobs.push(blob);
        } catch (e) {
          warn('Skip ảnh download fail:', url, e.message);
        }
      }
      if (blobs.length === 0) continue;
      setStatus(`Upload ${blobs.length} ảnh lên Cloudinary…`);
      try {
        const uploaded = await uploadToBackend(blobs);
        uploaded.forEach((u) => out.push(u.url));
      } catch (e) {
        warn('Upload batch fail:', e.message);
      }
    }
    return out;
  }

  // ---- Draft creation -----------------------------------------------------
  function createDraft(payload) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${getApiBase()}/admin/imports/google-maps/drafts`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        data: JSON.stringify(payload),
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (e) {
              reject(new Error('Response không phải JSON'));
            }
          } else {
            reject(new Error(`Tạo draft HTTP ${res.status}: ${res.responseText.slice(0, 300)}`));
          }
        },
        onerror: () => reject(new Error('Network error khi tạo draft')),
      });
    });
  }

  // ---- Main flow ----------------------------------------------------------
  async function runImport() {
    if (!ensureConfig()) return;

    try {
      setStatus('Đọc thông tin venue…');
      const info = extractInfo();
      if (!info.name) {
        toast('❌ Không tìm thấy tên venue — đảm bảo đang mở 1 place page', 'err');
        return;
      }
      log('Info:', info);

      setStatus('Mở tab Ảnh + scroll lazy load…');
      const venuePhotoUrls = await extractVenuePhotos(DEFAULTS.maxVenuePhotos);
      log(`Lấy được ${venuePhotoUrls.length} ảnh venue`);

      setStatus('Tìm ảnh menu (nếu Google có tag)…');
      const menuPhotoUrl = await extractMenuImage();
      log(`Menu image: ${menuPhotoUrl ? 'có' : 'không tìm thấy'}`);

      setStatus('Mở tab Đánh giá + scroll…');
      const reviews = await extractReviews(DEFAULTS.maxReviews, DEFAULTS.maxPhotosPerReview);
      log(`Lấy được ${reviews.length} reviews`);

      setStatus(`Upload ${venuePhotoUrls.length} ảnh venue…`);
      const uploadedVenueMedia = await uploadUrlsInBatches(venuePhotoUrls);
      log(`Cloudinary trả về ${uploadedVenueMedia.length} URL venue`);

      let uploadedMenuUrl = null;
      if (menuPhotoUrl) {
        setStatus('Upload ảnh menu…');
        const menuUploaded = await uploadUrlsInBatches([menuPhotoUrl]);
        uploadedMenuUrl = menuUploaded[0] || null;
      }

      const reviewsWithMedia = [];
      for (let i = 0; i < reviews.length; i++) {
        const r = reviews[i];
        if (r._photo_urls.length > 0) {
          setStatus(`Upload ảnh review ${i + 1}/${reviews.length}…`);
          r.media = await uploadUrlsInBatches(r._photo_urls);
        } else {
          r.media = [];
        }
        delete r._photo_urls;
        reviewsWithMedia.push(r);
      }
      const reviewMediaTotal = reviewsWithMedia.reduce((acc, r) => acc + (r.media?.length || 0), 0);
      log(`Tổng ảnh review đã upload: ${reviewMediaTotal}`);

      setStatus('Tạo draft import…');
      const payload = {
        input: info.source_url,
        source_url: info.source_url,
        source_place_id: info.source_place_id,
        normalized_payload: {
          name: info.name,
          address_line: info.address_line,
          phone_number: info.phone_number,
          website: info.website,
          rating_avg: info.rating_avg,
          review_count: info.review_count,
          latitude: info.latitude,
          longitude: info.longitude,
          media: uploadedVenueMedia,
          menu_image_url: uploadedMenuUrl,
          selected_reviews: reviewsWithMedia,
        },
        reviews: reviewsWithMedia,
        raw_payload: {
          input: info.source_url,
          extracted_at: new Date().toISOString(),
        },
      };
      const draft = await createDraft(payload);
      log('Draft created:', draft);

      setStatus(
        `✅ Xong! ${uploadedVenueMedia.length} ảnh venue` +
          (uploadedMenuUrl ? ' + 1 menu' : '') +
          ` + ${reviewsWithMedia.length} review (${reviewMediaTotal} ảnh). Vào /admin/imports.`,
        'ok',
      );
    } catch (e) {
      console.error(e);
      setStatus(`❌ ${e.message}`, 'err');
    }
  }

  // ---- UI ----------------------------------------------------------------
  let panelEl;
  let statusEl;

  function injectUI() {
    if (panelEl) return;
    panelEl = document.createElement('div');
    panelEl.style.cssText = `
      position: fixed; top: 12px; right: 12px; z-index: 999999;
      background: white; border-radius: 12px; padding: 10px 12px;
      box-shadow: 0 6px 20px rgba(0,0,0,.15); font-family: system-ui, sans-serif;
      font-size: 13px; max-width: 320px; border: 1px solid #e2e8f0;
    `;
    panelEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;">
        <strong style="color:#0f172a">📥 MyNook Importer <span style="font-weight:normal;color:#94a3b8;font-size:10px;">v0.2</span></strong>
        <button id="mynook-reset" title="Reset config" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:12px;">⚙</button>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button id="mynook-test" style="
          flex:1;padding:8px 10px;background:white;color:#0f172a;
          border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:500;font-size:12px;">
          🔍 Test
        </button>
        <button id="mynook-go" style="
          flex:2;padding:8px 10px;background:#0f172a;color:white;
          border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
          Import to MyNook
        </button>
      </div>
      <div id="mynook-status" style="margin-top:8px;color:#475569;font-size:12px;line-height:1.4;"></div>
    `;
    document.body.appendChild(panelEl);
    statusEl = panelEl.querySelector('#mynook-status');
    panelEl.querySelector('#mynook-go').addEventListener('click', runImport);
    panelEl.querySelector('#mynook-test').addEventListener('click', runDiagnose);
    panelEl.querySelector('#mynook-reset').addEventListener('click', resetConfig);
  }

  // Diagnose without uploading — quick sanity check
  async function runDiagnose() {
    setStatus('Diagnose: scan DOM hiện tại…');
    const before = diagnose();
    setStatus('Diagnose: click tab Ảnh + scroll…');
    await clickTab(['ảnh', 'photo', 'photos', 'hình']);
    await sleep(1500);
    await scrollFeed(6, 600);
    const after = diagnose();
    const reviewCards = $$('div[data-review-id]').length;
    setStatus(
      `Test xong: ${before} ảnh trước tab + ${after} sau scroll + ${reviewCards} review cards. Mở DevTools Console xem chi tiết.`,
      after > 0 ? 'ok' : 'err',
    );
  }

  function setStatus(msg, kind) {
    if (!statusEl) return;
    const color = kind === 'ok' ? '#059669' : kind === 'err' ? '#dc2626' : '#475569';
    statusEl.style.color = color;
    statusEl.textContent = msg;
  }

  function toast(msg, kind) {
    setStatus(msg, kind);
  }

  // Re-inject when SPA navigates
  function observeUrl() {
    let last = location.href;
    setInterval(() => {
      if (location.href !== last) {
        last = location.href;
        if (/\/maps\/place\//.test(last)) {
          injectUI();
        }
      }
    }, 800);
  }

  // Mini badge on web-client: shows sync status
  function injectWebClientBadge(synced) {
    if (document.getElementById('mynook-sync-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'mynook-sync-badge';
    badge.style.cssText = `
      position: fixed; bottom: 12px; right: 12px; z-index: 999999;
      background: ${synced ? '#059669' : '#94a3b8'}; color: white;
      padding: 6px 10px; border-radius: 999px;
      font: 11px system-ui, sans-serif; opacity: .85;
      box-shadow: 0 2px 8px rgba(0,0,0,.15); pointer-events: none;
    `;
    badge.textContent = synced
      ? '✓ MyNook Importer ready'
      : '⚠ MyNook Importer — đăng nhập để sync token';
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 4000);
  }

  // Boot — branch by environment
  if (isWebClient) {
    // On web-client: just sync the cookie token into GM storage
    const sync = () => {
      const ok = syncTokenFromWebClient();
      injectWebClientBadge(ok);
    };
    sync();
    // Re-check every 5s — cookie may appear after login completes async
    setInterval(syncTokenFromWebClient, 5000);
  } else {
    // On Google Maps: inject import panel
    if (/\/maps\/place\//.test(location.href)) injectUI();
    observeUrl();
    // Also retry every 2s in case Google rebuilds DOM
    setInterval(() => {
      if (/\/maps\/place\//.test(location.href) && !document.body.contains(panelEl)) {
        panelEl = null;
        injectUI();
      }
    }, 2000);
  }
})();
