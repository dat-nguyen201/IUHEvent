/**
 * IUHEvent - import data only. Does not alter app/backend source.
 * Run from IUHEvent/server: node ../IUHEvent_Atlas_DataOnly_6Collections/seed-atlas.cjs --apply
 * Dry run (no database access): same command without --apply.
 * Requires MongoDB Node driver already listed in server/package.json.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');

const ROOT = __dirname;
const DB = 'iuh_event';
const NAMES = ['users', 'events', 'registrations', 'reviews', 'savedEvents', 'notifications'];
const apply = process.argv.includes('--apply');
if (process.argv.includes('--help')) {
  console.log('Dùng từ thư mục IUHEvent/server:');
  console.log('  node ../IUHEvent_Atlas_DataOnly_6Collections/seed-atlas.cjs');
  console.log('  node ../IUHEvent_Atlas_DataOnly_6Collections/seed-atlas.cjs --apply');
  process.exit(0);
}

const raws = {};
for (const name of NAMES) {
  const lines = fs.readFileSync(path.join(ROOT, 'data', `${name}.jsonl`), 'utf8').trim().split(/\r?\n/);
  raws[name] = lines.map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${name}.jsonl dòng ${index + 1}: ${error.message}`); }
  });
}

function validateSeed(data) {
  const objectIdText = x => x && typeof x === 'object' && /^[a-f\d]{24}$/.test(x.$oid || '') ? x.$oid : null;
  const users = new Set(data.users.map(u => objectIdText(u._id)));
  const events = new Set(data.events.map(e => e.id));
  const published = new Set(data.events.filter(e => e.status === 'published').map(e => e.id));
  const registrations = new Map(data.registrations.map(r => [`${objectIdText(r.userId)}:${r.eventId}`,r]));
  for (const name of NAMES) {
    assert(data[name].length > 0, `${name} không có dữ liệu`);
    assert.equal(new Set(data[name].map(r => objectIdText(r._id))).size, data[name].length, `${name} trùng _id`);
    for (const row of data[name]) assert(objectIdText(row._id), `${name} có _id không hợp lệ`);
  }
  for (const r of data.registrations) {
    assert(users.has(objectIdText(r.userId)), 'Đăng ký tham chiếu user không tồn tại');
    assert(published.has(r.eventId), 'Đăng ký tham chiếu sự kiện không công bố');
  }
  for (const r of data.reviews) {
    const reg = registrations.get(`${objectIdText(r.userId)}:${r.eventId}`);
    assert(reg && reg.status === 'checked-in', 'Đánh giá chưa có lượt check-in');
    assert(r.rating >= 1 && r.rating <= 5, 'Số sao không hợp lệ');
  }
  for (const s of data.savedEvents) {
    assert(users.has(objectIdText(s.userId)) && published.has(s.eventId), 'Sự kiện đã lưu tham chiếu sai');
  }
  for (const n of data.notifications) {
    assert(users.has(objectIdText(n.userId)), 'Thông báo tham chiếu sai user');
    assert(!n.eventId || events.has(n.eventId), 'Thông báo tham chiếu sai sự kiện');
  }
  for (const e of data.events) {
    assert(e.imageUrl && e.imageUrl.startsWith('https://'), 'Ảnh sự kiện phải là URL HTTPS');
    assert(e.registeredCount <= e.capacity, 'Số đăng ký vượt sức chứa');
  }
}
validateSeed(raws);

console.log('\n=== IUHEvent - DỮ LIỆU ATLAS (GIỮ NGUYÊN CODE) ===');
console.log(`Database đích: ${DB}`);
for (const name of NAMES) console.log(`  ${name.padEnd(15)} ${raws[name].length} document mẫu`);
console.log('Ví dụ sự kiện:', raws.events.slice(0,3).map(e => e.title).join(' | '));
if (!apply) {
  console.log('\nĐây là xem trước. CHƯA thay đổi gì trên MongoDB Atlas.');
  console.log('Nếu muốn thực sự nhập dữ liệu, chạy lại với --apply.');
  process.exit(0);
}

function bsonify(value, ObjectId) {
  if (Array.isArray(value)) return value.map(x => bsonify(x, ObjectId));
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && typeof value.$oid === 'string') return new ObjectId(value.$oid);
    if (Object.keys(value).length === 1 && typeof value.$date === 'string') {
      const date = new Date(value.$date);
      if (Number.isNaN(+date)) throw new Error('Ngày tháng JSON không hợp lệ');
      return date;
    }
    return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,bsonify(v,ObjectId)]));
  }
  return value;
}

async function run() {
  // Resolve npm dependencies from the user's existing server project, not this data directory.
  const serverRoot = process.cwd();
  if (!fs.existsSync(path.join(serverRoot, 'package.json'))) {
    throw new Error('Hãy cd vào thư mục IUHEvent/server trước khi chạy.');
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(serverRoot, 'package.json'),'utf8'));
  if (pkg.name !== 'iuh-event-api') throw new Error('Đây không phải thư mục server của IUHEvent.');
  const serverRequire = createRequire(path.join(serverRoot, 'package.json'));
  const { MongoClient, ObjectId } = serverRequire('mongodb');
  // Load only the local server/.env, not any uploaded example containing credentials.
  serverRequire('dotenv').config({path:path.join(serverRoot,'.env')});
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || DB;
  if (dbName !== DB) throw new Error(`Từ chối ghi vào DB "${dbName}". Cần đặt MONGODB_DB_NAME=${DB}.`);
  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error('Chưa có MONGODB_URI hợp lệ trong server/.env.');
  }
  const docs = Object.fromEntries(NAMES.map(name => [name, raws[name].map(x => bsonify(x,ObjectId))]));
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  try {
    await client.connect();
    const db = client.db(DB);
    console.log(`\nĐã kết nối Atlas - đang bổ sung vào database ${DB}...`);
    for (const name of NAMES) {
      const coll = db.collection(name);
      // Fixed deterministic _id + $setOnInsert = never rewrite original data or old seed edits.
      // Existing unique indexes (email, studentId, event id, user+event) remain respected.
      const operations = docs[name].map(doc => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $setOnInsert: doc },
          upsert: true,
        },
      }));
      const result = await coll.bulkWrite(operations,{ordered:false});
      console.log(`  ${name.padEnd(15)} mới: ${result.upsertedCount}, đã có: ${result.matchedCount}`);
    }
    // Reconcile counters with current registration documents (includes subsequent real app activity).
    // Only event-demo26-* records created in this dataset are touched; all original events stay intact.
    const ids = docs.events.map(e => e.id);
    const counts = await db.collection('registrations').aggregate([
      {$match:{eventId:{$in:ids},status:{$in:['registered','checked-in']}}},
      {$group:{_id:'$eventId',registeredCount:{$sum:1},checkedInCount:{$sum:{$cond:[{$eq:['$status','checked-in']},1,0]}}}},
    ]).toArray();
    const stats = new Map(counts.map(x => [x._id,x]));
    const adjust = docs.events.map(e => {
      const st=stats.get(e.id);
      return {updateOne:{filter:{id:e.id,_id:e._id},update:{$set:{registeredCount:st?.registeredCount||0,checkedInCount:st?.checkedInCount||0}}}};
    });
    await db.collection('events').bulkWrite(adjust,{ordered:false});
    console.log('\nHOÀN THÀNH: Dữ liệu mẫu đã được thêm, các bản ghi cũ được giữ nguyên.');
    for(const name of NAMES) {
      const ids=docs[name].map(x=>x._id);
      console.log(`  Kiểm tra ${name}: ${await db.collection(name).countDocuments({_id:{$in:ids}})}/${ids.length}`);
    }
  } finally {
    await client.close();
  }
}
run().catch(error => {
  console.error('\nLỖI NHẬP ATLAS:',error?.message||error);
  console.error('Không xóa collection để sửa lỗi. Kiểm tra URI/Network Access/index rồi chạy lại --apply.');
  process.exitCode=1;
});
