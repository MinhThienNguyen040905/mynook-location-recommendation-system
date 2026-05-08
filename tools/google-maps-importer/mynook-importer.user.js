// ==UserScript==
// @name         MyNook · Google Maps Importer
// @namespace    https://mynook.local/
// @version      0.1.0
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
    const tabs = $$('button[role="tab"], div[role="tab"]');
    for (const t of tabs) {
      const text = (t.getAttribute('aria-label') || t.textContent || '').toLowerCase();
      if (labelKeywords.some((k) => text.includes(k))) return t;
    }
    return null;
  }

  async function clickTab(keywords) {
    const btn = findTabButton(keywords);
    if (!btn) return false;
    btn.click();
    await sleep(800);
    return true;
  }

  async function scrollFeed(times = 6) {
    const feed = $('div[role="main"] div[role="region"]') ||
                 $('div[role="main"]');
    if (!feed) return;
    for (let i = 0; i < times; i++) {
      const target = feed.querySelector('div[role="region"]') ||
                     feed.querySelector('.m6QErb[role="region"]') ||
                     feed;
      target.scrollBy(0, 1500);
      await sleep(700);
    }
  }

  // ---- Photo extraction ---------------------------------------------------
  async function extractVenuePhotos(max) {
    const ok = await clickTab(['ảnh', 'photo']);
    if (!ok) {
      log('Không tìm thấy tab ảnh — bỏ qua photos');
      return [];
    }
    await sleep(1200);
    await scrollFeed(4);

    const urls = new Set();

    $$('a[data-photo-index] img, button[jsaction*="photo"] img').forEach((img) => {
      if (img.src && img.src.includes('googleusercontent.com')) {
        urls.add(upsizePhotoUrl(img.src, DEFAULTS.photoSize));
      }
    });

    $$('a[data-photo-index], button[jsaction*="photo"]').forEach((el) => {
      const u = bgUrl(el) || bgUrl(el.querySelector('div[style*="background-image"]'));
      if (u && u.includes('googleusercontent.com')) {
        urls.add(upsizePhotoUrl(u, DEFAULTS.photoSize));
      }
    });

    return Array.from(urls).slice(0, max);
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
    const ok = await clickTab(['đánh giá', 'review']);
    if (!ok) {
      log('Không tìm thấy tab reviews');
      return [];
    }
    await sleep(1200);
    await scrollFeed(6);

    const cards = $$('div[data-review-id]');
    const out = [];
    for (const card of cards.slice(0, maxReviews)) {
      await expandReviewMore(card);

      const reviewId = card.getAttribute('data-review-id');
      const author = pickFirstText(['button div.d4r55', 'div.d4r55'], card);
      const ratingEl = card.querySelector('span[role="img"][aria-label]');
      const rating = parseRatingFromAriaLabel(ratingEl?.getAttribute('aria-label'));
      const content = pickFirstText(['span.wiI7pd', 'div.MyEned span', 'span[jsname]'], card);
      const publishedAt = pickFirstText(['span.rsqaWe', 'span.xRkPPb'], card);

      if (!content) continue;

      const photoUrls = new Set();
      card.querySelectorAll('button[data-photo-index], div[style*="background-image"]').forEach((el) => {
        const u = bgUrl(el);
        if (u && u.includes('googleusercontent.com')) {
          photoUrls.add(upsizePhotoUrl(u, DEFAULTS.photoSize));
        }
      });
      card.querySelectorAll('img').forEach((img) => {
        if (img.src && img.src.includes('googleusercontent.com') && /=w\d+-h\d+/.test(img.src)) {
          photoUrls.add(upsizePhotoUrl(img.src, DEFAULTS.photoSize));
        }
      });

      out.push({
        source_review_id: reviewId,
        author_name: author || null,
        rating,
        content,
        published_at: publishedAt || null,
        _photo_urls: Array.from(photoUrls).slice(0, maxPhotosPerReview),
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

      setStatus('Mở tab ảnh + scroll…');
      const venuePhotoUrls = await extractVenuePhotos(DEFAULTS.maxVenuePhotos);
      log(`Lấy được ${venuePhotoUrls.length} ảnh venue`);

      setStatus('Mở tab reviews + scroll…');
      const reviews = await extractReviews(DEFAULTS.maxReviews, DEFAULTS.maxPhotosPerReview);
      log(`Lấy được ${reviews.length} reviews`);

      setStatus(`Upload ${venuePhotoUrls.length} ảnh venue…`);
      const uploadedVenueMedia = await uploadUrlsInBatches(venuePhotoUrls);

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
        `✅ Tạo draft xong! ${uploadedVenueMedia.length} ảnh venue + ${reviewsWithMedia.length} reviews. Vào /admin/imports để confirm.`,
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
        <strong style="color:#0f172a">📥 MyNook Importer</strong>
        <button id="mynook-reset" title="Reset config" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:12px;">⚙</button>
      </div>
      <button id="mynook-go" style="
        margin-top:8px;width:100%;padding:8px 10px;background:#0f172a;color:white;
        border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
        Import to MyNook
      </button>
      <div id="mynook-status" style="margin-top:8px;color:#475569;font-size:12px;line-height:1.4;"></div>
    `;
    document.body.appendChild(panelEl);
    statusEl = panelEl.querySelector('#mynook-status');
    panelEl.querySelector('#mynook-go').addEventListener('click', runImport);
    panelEl.querySelector('#mynook-reset').addEventListener('click', resetConfig);
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
