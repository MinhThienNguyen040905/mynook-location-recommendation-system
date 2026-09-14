const assert = require('node:assert/strict');
const { DEMO_ACCOUNTS, DEMO_VENUE_ID, DEMO_REVIEW_ID } = require('../../libs/shared-types/src/lib/demo.ts');
const origin = process.argv[2] || 'http://127.0.0.1:3101';

async function request(path, { method = 'GET', token, body, status = 200 } = {}) {
  const response = await fetch(`${origin}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(45000),
  });
  assert.equal(response.status, status, `${method} ${path}: expected ${status}, got ${response.status}`);
  console.log(`PASS ${method} ${path}: ${status}`);
  return response.json();
}

(async () => {
  await request('/auth/demo', { method: 'POST', body: { role: 'admin' }, status: 400 });
  await request('/auth/demo', { method: 'POST', body: {}, status: 400 });
  const customer = await request('/auth/demo', { method: 'POST', body: { role: 'customer', id: 'ignored' }, status: 201 });
  const owner = await request('/auth/demo', { method: 'POST', body: { role: 'owner' }, status: 201 });
  if (!origin.includes('127.0.0.1:3101')) {
    for (const [role, session, path] of [
      ['owner', owner, '/dashboard'], ['customer', customer, '/favorites'],
      ['owner', owner, '/login'],
    ]) {
      const page = await fetch(`${origin}${path}`, { redirect: 'manual',
        headers: { Cookie: `mynook_access_token=${session.access_token}; user_type=${role}` },
        signal: AbortSignal.timeout(45000) });
      assert.equal(page.status, 200, `Authenticated ${role} should open ${path} without redirect`);
      console.log(`PASS ${role} page ${path}: 200`);
    }
    const anonymous = await fetch(`${origin}/dashboard`, { redirect: 'manual' });
    assert.equal(anonymous.status, 307);
    console.log('PASS anonymous dashboard redirects to login');
  }
  for (const [role, session] of Object.entries({ customer, owner })) {
    assert.equal(session.user.id, DEMO_ACCOUNTS[role].id);
    assert.equal(session.user.type, role);
    assert.equal(session.user.is_demo, true);
    assert.equal(session.user.demo_venue_id, DEMO_VENUE_ID);
    assert.equal(session.user.password_hash, undefined);
    const token = session.access_token;
    const profile = await request('/auth/profile', { token });
    assert.equal(profile.is_demo, true);
    await request('/admin/dashboard', { token, status: 403 });
    await request('/auth/change-password', { method: 'POST', token, body: { old_password: 'ignored', new_password: 'NotARealPassword123!' }, status: 403 });
    await request('/auth/profile', { method: 'PATCH', token, body: { full_name: 'Should not change' }, status: 403 });
    await request(`/venues/${DEMO_VENUE_ID}`, { method: 'DELETE', token, status: 403 });
    await request('/upload', { method: 'POST', token, body: {}, status: 403 });
    await request('/venue-reports', { method: 'POST', token, body: {}, status: 403 });
  }
  const venues = await request('/venues');
  const otherVenue = venues.find(venue => venue.id !== DEMO_VENUE_ID);
  assert.ok(otherVenue);
  await request(`/venues/${otherVenue.id}`, { method: 'PATCH', token: owner.access_token, body: { name: 'Should not change' }, status: 403 });
  await request('/reviews', { method: 'POST', token: customer.access_token,
    body: { venue_id: otherVenue.id, rating: 5, content: 'Should never publish outside the sample venue.' }, status: 403 });
  const owned = await request('/venues/owner/my-venues', { token: owner.access_token });
  assert.equal(owned.length, 1);
  assert.equal(owned[0].id, DEMO_VENUE_ID);
  await request(`/venues/${DEMO_VENUE_ID}/menu/categories`, { token: owner.access_token });
  await request(`/interactions/venues/${DEMO_VENUE_ID}/analytics`, { token: owner.access_token });

  const refreshed = await request('/auth/refresh', { method: 'POST', body: { refresh_token: customer.refresh_token }, status: 201 });
  await request('/auth/profile', { method: 'PATCH', token: refreshed.access_token, body: {}, status: 403 });
  await request('/auth/forgot-password', { method: 'POST', body: { email: DEMO_ACCOUNTS.customer.email }, status: 201 });

  // Exercise reversible writes only on these newly provisioned demo fixtures.
  const beforeFavorites = await request('/favorites/ids', { token: customer.access_token });
  const wasFavorite = beforeFavorites.venue_ids.includes(DEMO_VENUE_ID);
  await request(`/favorites/${DEMO_VENUE_ID}`, { method: 'POST', token: customer.access_token, status: 201 });
  assert.ok((await request('/favorites/ids', { token: customer.access_token })).venue_ids.includes(DEMO_VENUE_ID));
  if (!wasFavorite) await request(`/favorites/${DEMO_VENUE_ID}`, { method: 'DELETE', token: customer.access_token });

  const previous = (await request(`/reviews/venue/${DEMO_VENUE_ID}`)).find(r => r.id === DEMO_REVIEW_ID);
  assert.ok(previous, 'Expected the seeded demo review');
  try {
    for (const rating of [4, 5]) {
      const review = await request('/reviews', { method: 'POST', token: customer.access_token, status: 201,
        body: { venue_id: DEMO_VENUE_ID, rating, content: 'Đánh giá thử tự động trên quán mẫu riêng của MyNook.' } });
      assert.equal(review.id, DEMO_REVIEW_ID);
      assert.equal(review.rating, rating);
    }
    const after = await request(`/reviews/venue/${DEMO_VENUE_ID}`);
    assert.equal(after.filter(r => r.account_id === DEMO_ACCOUNTS.customer.id).length, 1);
  } finally {
    await request('/reviews', { method: 'POST', token: customer.access_token, status: 201,
      body: { venue_id: DEMO_VENUE_ID, rating: previous.rating, content: previous.content } });
  }
  console.log('Demo login, refresh, owner data, favorites, bounded review writes and access restrictions passed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
