/**
 * One-time migration: drop the stale `hsnCode_1` index from the gstmasters collection.
 * This index was left over from an old schema and causes E11000 duplicate key errors.
 * Run once with:  node scripts/drop-gst-hsncode-index.mjs
 */
import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://nikunjadhiya32:nikunj12345@cluster0.iqlhxn9.mongodb.net/test';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('test');
    const col = db.collection('gstmasters');

    // List current indexes
    const indexes = await col.indexes();
    console.log('\n📋 Current indexes on gstmasters:');
    indexes.forEach((idx) => console.log(' -', idx.name, JSON.stringify(idx.key)));

    // Drop hsnCode_1 if it exists
    const hasHsnIndex = indexes.some((idx) => idx.name === 'hsnCode_1');
    if (hasHsnIndex) {
      await col.dropIndex('hsnCode_1');
      console.log('\n🗑️  Dropped stale index: hsnCode_1');
    } else {
      console.log('\nℹ️  Index hsnCode_1 not found — nothing to drop.');
    }

    // Verify remaining indexes
    const remaining = await col.indexes();
    console.log('\n✅ Remaining indexes:');
    remaining.forEach((idx) => console.log(' -', idx.name, JSON.stringify(idx.key)));
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected.');
  }
}

main();
