const API_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('--- 1. Health check ---');
  const health = await request('/health');
  console.log('Health:', health.data);
  if (!health.ok || health.data.database !== 'connected') {
    throw new Error('Backend is not healthy or database not connected');
  }

  console.log('\n--- 2. Register student account ---');
  const testEmail = `student_${Date.now()}@iuh.edu.vn`;
  const registerRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Nguyễn Văn Sinh Viên',
      studentId: `SV${Date.now().toString().slice(-6)}`,
      email: testEmail,
      password: 'Password123!',
    },
  });
  console.log('Register status:', registerRes.status, 'user:', registerRes.data?.user?.email);
  if (!registerRes.ok) throw new Error(`Register failed: ${JSON.stringify(registerRes.data)}`);

  const token = registerRes.data.accessToken;

  console.log('\n--- 3. Public Events API ---');
  const eventsRes = await request('/api/events?page=1&pageSize=5');
  console.log('Get events:', eventsRes.status, 'total:', eventsRes.data?.total, 'items count:', eventsRes.data?.data?.length);
  if (!eventsRes.ok || eventsRes.data?.data?.length === 0) {
    throw new Error('Get events failed');
  }

  const sampleEvent = eventsRes.data.data[0];
  const sampleEventId = sampleEvent.id;
  console.log('Sample event id:', sampleEventId, 'title:', sampleEvent.title);

  console.log('\n--- 4. Event Detail API ---');
  const detailRes = await request(`/api/events/${sampleEventId}`);
  console.log('Get detail:', detailRes.status, 'title:', detailRes.data?.data?.title);
  if (!detailRes.ok) throw new Error('Get detail failed');

  console.log('\n--- 5. Saved Events API (Initial) ---');
  const initialSaved = await request('/api/me/saved-events', { token });
  console.log('Initial saved count:', initialSaved.data?.data?.length);

  console.log('\n--- 6. Save Event ---');
  const saveRes = await request(`/api/me/saved-events/${sampleEventId}`, { method: 'POST', token });
  console.log('Save event result:', saveRes.status, saveRes.data);
  if (!saveRes.ok) throw new Error('Save event failed');

  console.log('\n--- 7. Saved Events API (After Save) ---');
  const savedAfter = await request('/api/me/saved-events', { token });
  console.log('Saved count after:', savedAfter.data?.data?.length);
  const foundSaved = savedAfter.data?.data?.find((i) => i.eventId === sampleEventId);
  if (!foundSaved) throw new Error('Saved event not found in list');

  console.log('\n--- 8. Delete Saved Event ---');
  const unsaveRes = await request(`/api/me/saved-events/${sampleEventId}`, { method: 'DELETE', token });
  console.log('Unsave result:', unsaveRes.status, unsaveRes.data);
  if (!unsaveRes.ok) throw new Error('Unsave failed');

  console.log('\n--- 9. Registrations API (Initial) ---');
  const initialRegs = await request('/api/me/registrations', { token });
  console.log('Initial registrations count:', initialRegs.data?.data?.length);

  console.log('\n--- 10. Register for Event ---');
  // Find an upcoming published event for registration
  const allEventsRes = await request('/api/events?page=1&pageSize=50');
  const upcomingEvent = allEventsRes.data?.data?.find(
    (e) => new Date(e.startsAt).getTime() > Date.now()
  );
  if (!upcomingEvent) throw new Error('No upcoming event found for registration test');

  const regEventId = upcomingEvent.id;
  console.log('Registering for upcoming event:', regEventId, upcomingEvent.title);
  const registerEventRes = await request(`/api/me/registrations/${regEventId}`, { method: 'POST', token });
  console.log('Register event status:', registerEventRes.status, registerEventRes.data);
  if (!registerEventRes.ok) throw new Error(`Register for event failed: ${JSON.stringify(registerEventRes.data)}`);

  console.log('\n--- 11. Registrations API (After Register) ---');
  const regsAfter = await request('/api/me/registrations', { token });
  console.log('Registrations count after:', regsAfter.data?.data?.length);
  const regItem = regsAfter.data?.data?.find((i) => i.eventId === regEventId);
  if (!regItem || regItem.status !== 'registered') throw new Error('Registration status not registered');

  console.log('\n--- 12. Check-in Event with QR ---');
  const checkInRes = await request(`/api/me/registrations/${regEventId}/check-in`, {
    method: 'POST',
    token,
    body: { qrValue: regEventId },
  });
  console.log('Check-in status:', checkInRes.status, checkInRes.data);
  if (!checkInRes.ok || checkInRes.data?.status !== 'checked-in') {
    throw new Error('Check-in failed');
  }

  console.log('\n--- 13. Re-Check-in should fail with ALREADY_CHECKED_IN (409) ---');
  const reCheckInRes = await request(`/api/me/registrations/${regEventId}/check-in`, {
    method: 'POST',
    token,
    body: { qrValue: regEventId },
  });
  console.log('Re-check-in status:', reCheckInRes.status, 'code:', reCheckInRes.data?.code);
  if (reCheckInRes.status !== 409 || reCheckInRes.data?.code !== 'ALREADY_CHECKED_IN') {
    throw new Error('Expected ALREADY_CHECKED_IN error');
  }

  console.log('\n--- 14. Check-in without registration should fail with REGISTRATION_REQUIRED (409) ---');
  // Find another event
  const otherEvent = allEventsRes.data?.data?.find((e) => e.id !== regEventId);
  const checkInWithoutReg = await request(`/api/me/registrations/${otherEvent.id}/check-in`, {
    method: 'POST',
    token,
    body: { qrValue: otherEvent.id },
  });
  console.log('Check-in without reg status:', checkInWithoutReg.status, 'code:', checkInWithoutReg.data?.code);
  if (checkInWithoutReg.status !== 409 || checkInWithoutReg.data?.code !== 'REGISTRATION_REQUIRED') {
    throw new Error('Expected REGISTRATION_REQUIRED error');
  }

  console.log('\n=========================================');
  console.log('🎉 ALL STUDENT FLOW API TESTS PASSED! 🎉');
  console.log('=========================================');
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
