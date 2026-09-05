// ═══════════════════════════════════════════════════════════════
// 🎓 INDEX DEMO — dikhata hai MongoDB ek query ko KAISE chalata hai:
//    poori collection scan karke (COLLSCAN)   ← index nahi hai
//    ya seedha index se jump karke (IXSCAN)   ← index hai
//
//    chalao:  node db-explain-demo.mjs
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';
import mongoose from 'mongoose';
import Task from './src/models/mongodb/Task.js';

const line = (t) => console.log('\n' + '─'.repeat(4) + ' ' + t + ' ' + '─'.repeat(50 - t.length));

const summarize = (explain) => {
  const stats = explain.executionStats;
  const winningPlan = explain.queryPlanner.winningPlan;

  // stage ka naam dhoondo (nested ho sakta hai)
  const findStage = (node) => {
    if (!node) return 'UNKNOWN';
    if (node.stage === 'COLLSCAN' || node.stage === 'IXSCAN') return node.stage;
    return findStage(node.inputStage);
  };

  console.log('  Stage             :', findStage(winningPlan));
  console.log('  Docs examined     :', stats.totalDocsExamined);
  console.log('  Keys examined     :', stats.totalKeysExamined);
  console.log('  Docs returned     :', stats.nReturned);
  console.log('  Time (ms)         :', stats.executionTimeMillis);
};

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI .env me nahi mila');
    process.exit(1);
  }

  console.log('🔌 MongoDB se jud raha hoon...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ connected\n');

  const total = await Task.countDocuments();
  console.log(`📊 Total tasks in DB: ${total}`);
  if (total === 0) {
    console.log('⚠️  koi task nahi hai — pehle app se kuch tasks bana lo, phir ye chalao');
    process.exit(0);
  }

  const sample = await Task.findOne().lean();
  const userId = sample.assignedTo;

  // ── QUERY 1: INDEXED — assignedTo + status ────────────────────
  line('QUERY 1: indexed field (assignedTo + status)');
  console.log(`  Task.find({ assignedTo: ${userId}, status: 'todo' })`);
  const explain1 = await Task.find({ assignedTo: userId, status: 'todo' })
    .explain('executionStats');
  summarize(explain1);

  // ── QUERY 2: NOT INDEXED — description regex ──────────────────
  line('QUERY 2: NOT indexed (description text search)');
  console.log(`  Task.find({ description: { $regex: 'e', $options: 'i' } })`);
  const explain2 = await Task.find({ description: { $regex: 'e', $options: 'i' } })
    .explain('executionStats');
  summarize(explain2);

  line('FARAK');
  console.log('  Query 1 (indexed)     → IXSCAN → seedha sahi jagah pahunch gaya');
  console.log('  Query 2 (not indexed) → COLLSCAN → HAR document check kiya');
  console.log('  Jitne zyada tasks honge, farak utna hi badhta jaayega.\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
