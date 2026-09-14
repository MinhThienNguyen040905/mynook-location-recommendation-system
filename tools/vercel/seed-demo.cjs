// Idempotent, additive fixtures. Does not copy or reset any existing user's data.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { DEMO_ACCOUNTS, DEMO_VENUE_ID, DEMO_REVIEW_ID } = require('../../libs/shared-types/src/lib/demo.ts');
const databaseUrl = new URL(process.env.DATABASE_URL);
if (databaseUrl.hostname.endsWith('.pooler.supabase.com')) databaseUrl.port = '6543';
const client = new Client({ connectionString: databaseUrl.toString(), ssl: databaseUrl.hostname.includes('supabase.com') ? { rejectUnauthorized: false } : false });
const menuCategoryId = '2b91bc60-0be3-4103-be8a-faedc5499ac1';

(async () => {
  await client.connect();
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('mynook-demo-fixtures-v1'))");
  for (const [role, account] of Object.entries(DEMO_ACCOUNTS)) {
    const existing = await client.query('SELECT id, email, type FROM auth_schema.accounts WHERE id = $1 OR email = $2', [account.id, account.email]);
    if (existing.rows.some(row => row.id !== account.id || row.email !== account.email || row.type !== role)) throw new Error('Fixture account collision');
    await client.query(`INSERT INTO auth_schema.accounts (id, email, full_name, type, password_hash, is_active)
      VALUES ($1, $2, $3, $4, NULL, true) ON CONFLICT (id) DO NOTHING`,
      [account.id, account.email, role === 'owner' ? 'Chủ quán Demo' : 'Khách trải nghiệm Demo', role]);
  }
  const existingVenue = await client.query('SELECT owner_id FROM venue_schema.venues WHERE id = $1', [DEMO_VENUE_ID]);
  if (existingVenue.rows.some(row => row.owner_id !== DEMO_ACCOUNTS.owner.id)) throw new Error('Fixture venue collision');
  await client.query(`INSERT INTO venue_schema.venues
    (id, owner_id, name, branch_name, description, address_line, latitude, longitude, media,
     total_capacity, max_group_size, is_group_friendly, rating_avg, review_count, search_document)
    VALUES ($1, $2, $3, 'Không gian trải nghiệm', $4, 'Địa điểm giả lập phục vụ demo, không phải cơ sở kinh doanh thực tế',
      10.7769, 106.7009, $5::jsonb, 40, 8, true, 5, 1, $6) ON CONFLICT (id) DO NOTHING`,
    [DEMO_VENUE_ID, DEMO_ACCOUNTS.owner.id, 'MyNook Studio — Quán mẫu (Demo)',
      'Quán mẫu dành cho nhà tuyển dụng trải nghiệm MyNook. Bạn có thể lưu yêu thích và viết đánh giá thử tại đây. Đánh giá demo dùng chung và lần gửi mới thay thế lần trước. Không nhập thông tin cá nhân. Không gian cà phê yên tĩnh, bàn làm việc rộng và khu ngồi nhóm là dữ liệu minh họa.',
      JSON.stringify(['https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80']),
      'MyNook Studio quán mẫu demo cà phê yên tĩnh học tập làm việc nhóm']);
  await client.query(`INSERT INTO venue_schema.venue_categories (venue_id, category_id, is_primary)
    SELECT $1, id, true FROM venue_schema.categories WHERE key = 'cafe'
    ON CONFLICT (venue_id, category_id) DO NOTHING`, [DEMO_VENUE_ID]);
  await client.query(`INSERT INTO venue_schema.menu_categories (id, venue_id, name, display_order)
    VALUES ($1, $2, 'Đồ uống mẫu', 0) ON CONFLICT (id) DO NOTHING`, [menuCategoryId, DEMO_VENUE_ID]);
  for (const [name, price] of [['Cà phê sữa', 35000], ['Latte', 45000], ['Trà đào', 40000]]) {
    await client.query(`INSERT INTO venue_schema.menu_items (venue_id, category_id, name, price)
      SELECT $1::uuid, $2::uuid, $3::varchar, $4::numeric WHERE NOT EXISTS
      (SELECT 1 FROM venue_schema.menu_items WHERE venue_id = $1::uuid AND name = $3::varchar)`, [DEMO_VENUE_ID, menuCategoryId, name, price]);
  }
  const existingReview = await client.query('SELECT account_id, venue_id FROM interaction_schema.reviews WHERE id = $1', [DEMO_REVIEW_ID]);
  if (existingReview.rows.some(row => row.account_id !== DEMO_ACCOUNTS.customer.id || row.venue_id !== DEMO_VENUE_ID)) throw new Error('Fixture review collision');
  await client.query(`INSERT INTO interaction_schema.reviews (id, account_id, venue_id, rating, content)
    VALUES ($1, $2, $3, 5, $4) ON CONFLICT (id) DO NOTHING`,
    [DEMO_REVIEW_ID, DEMO_ACCOUNTS.customer.id, DEMO_VENUE_ID, 'Đánh giá mẫu: Không gian yên tĩnh, bàn rộng và đồ uống dễ chọn. Hãy thử viết đánh giá để thay thế nội dung minh họa này.']);
  await client.query('COMMIT');
  console.log('Demo fixtures ready: 2 passwordless accounts, 1 sample venue, 3 menu items, 1 sample review.');
})().catch(async error => {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Demo seed failed:', error.code || error.message);
  process.exitCode = 1;
}).finally(() => client.end());
