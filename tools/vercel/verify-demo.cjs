const assert = require('node:assert/strict');
const origin = process.argv[2] || 'https://mynook-demo.vercel.app';

async function request(path, expected = 200) {
  const started = Date.now();
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(60_000), redirect: 'manual' });
  assert.equal(response.status, expected, `${path}: expected ${expected}, got ${response.status}`);
  console.log(`PASS ${path} (${Date.now() - started}ms)`);
  return response;
}

(async () => {
  const categories = await (await request('/api/categories')).json();
  assert.ok(Array.isArray(categories) && categories.length > 0, 'Expected real categories');
  const venues = await (await request('/api/venues')).json();
  assert.ok(Array.isArray(venues) && venues.length > 0, 'Expected real venues');
  console.log(`Loaded ${venues.length} venues and ${categories.length} categories`);
  const id = venues[0].id;
  const detail = await (await request(`/api/venues/${id}`)).json();
  assert.equal(detail.id, id);
  await request(`/api/reviews/venue/${id}`);
  const search = await (await request(`/api/search/public?q=${encodeURIComponent('cà phê yên tĩnh')}&debug=1`)).json();
  assert.ok(Array.isArray(search.results) && search.results.length > 0, 'Expected search results');
  assert.equal(search.results[0].score_breakdown?.strategy, 'attribute', 'AI should understand an attribute search');
  assert.equal(search.results[0].score_breakdown?.category_match, 1, 'Coffee search should return a matching category');
  await request('/api/admin/dashboard', 401);
  await request('/api/auth/profile', 401);
  const home = await (await request('/')).text();
  assert.ok(home.includes('Find your perfect'), 'Home page should render the product');
  assert.ok(home.includes(venues[0].name), 'Home page should render real venues');
  const page = await (await request(`/venues/${id}`)).text();
  assert.ok(page.includes(detail.name), 'Venue detail should render the correct name');
  await request('/search');
  await request('/login');
  // A venue screen loads several APIs at once; this caught session-pool exhaustion.
  await Promise.all([
    '/api/categories', '/api/venues', `/api/venues/${id}`,
    `/api/reviews/venue/${id}`, '/',
  ].map(path => request(path)));
  console.log('Public demo checks passed. No accounts or records were created.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
