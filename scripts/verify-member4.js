// Verification script for Member 4 functionality
const assert = require('assert');

function parseEventQrCode(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const obj = JSON.parse(trimmed);
    if (obj.eventId && typeof obj.eventId === 'string') return obj.eventId;
    if (obj.id && typeof obj.id === 'string') return obj.id;
  } catch {
    // Not JSON format
  }

  if (trimmed.startsWith('student-event:')) {
    return trimmed.replace('student-event:', '').trim();
  }

  const urlMatch = trimmed.match(/\/events\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  return trimmed;
}

console.log('🧪 Testing Member 4 QR Check-in & Logic...');

// Test 1: Plain ID
assert.strictEqual(parseEventQrCode('event-1'), 'event-1', 'Plain event-1 should pass');

// Test 2: Prefixed student-event
assert.strictEqual(parseEventQrCode('student-event:event-2'), 'event-2', 'Prefixed student-event:event-2 should pass');

// Test 3: JSON format
assert.strictEqual(parseEventQrCode('{"eventId": "event-3"}'), 'event-3', 'JSON eventId should pass');
assert.strictEqual(parseEventQrCode('{"id": "event-4"}'), 'event-4', 'JSON id should pass');

// Test 4: Deep link URL
assert.strictEqual(parseEventQrCode('studenteventapp://events/event-5'), 'event-5', 'Deep link URL should pass');
assert.strictEqual(parseEventQrCode('https://iuhevent.edu.vn/events/event-1'), 'event-1', 'Web URL should pass');

// Test 5: Empty or whitespace
assert.strictEqual(parseEventQrCode('   '), null, 'Whitespace should return null');

console.log('✅ All 5 QR Parsing tests passed successfully!');
