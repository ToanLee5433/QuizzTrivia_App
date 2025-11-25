# 🚀 PHASE 2 DEPLOYMENT GUIDE

## 📋 PRE-DEPLOYMENT CHECKLIST

Before deploying Phase 2 automation features, ensure:

- [x] All 4 phases implemented
- [ ] Functions code built successfully
- [ ] Firebase project configured
- [ ] Service account has Storage permissions
- [ ] Index backup created
- [ ] Testing environment ready

---

## 📦 INSTALLATION

### **1. Install Dependencies**

```bash
# Root project
npm install

# Functions
cd functions
npm install
cd ..
```

### **2. Configure Firebase**

Ensure `functions/src/lib/storageUtils.ts` has correct bucket:
```typescript
const STORAGE_BUCKET = 'datn-quizapp.appspot.com';
```

---

## 🔄 MIGRATION PATH

### **WEEK 1: Storage Migration (Phase 2.1)**

#### **Step 1: Create Backup**
```bash
# Backup current Firestore index
npm run backup:index
```

#### **Step 2: Build Fresh Index**
```bash
# Build and save locally
npm run build:index
```

#### **Step 3: Upload to Cloud Storage**
```bash
# Upload to Firebase Storage
npm run upload:index
```

#### **Step 4: Deploy Migration Functions**
```bash
cd functions
npm run build
firebase deploy --only functions:migrateIndexToStorage,functions:getMigrationStatus
```

#### **Step 5: Verify Migration**
```bash
# Check migration status
curl https://us-central1-datn-quizapp.cloudfunctions.net/getMigrationStatus
```

Expected response:
```json
{
  "firestore": { "exists": true, "totalChunks": 150 },
  "storage": { "exists": true, "totalChunks": 150 },
  "recommendation": "Both exist. Migration may have succeeded."
}
```

#### **Step 6: Update RAG Functions**
```bash
# Deploy updated askRAG function (uses Storage)
firebase deploy --only functions:askRAG
```

#### **Step 7: Test Chatbot**
- Open app
- Login as user
- Ask chatbot: "Toán học là gì?"
- Verify response is correct
- Check logs: Should see "✅ Loaded index from Storage"

#### **Step 8: Cleanup (Optional)**
```bash
# After 1 week of stable operation, delete Firestore document
firebase firestore:delete system/vector-index
```

---

### **WEEK 2: Enable Triggers (Phase 2.2)**

#### **Step 1: Deploy Trigger Functions**
```bash
cd functions
firebase deploy --only \
  functions:onQuizCreated,\
  functions:onQuizUpdated,\
  functions:onQuizDeleted
```

#### **Step 2: Test Triggers**

**Test Create:**
```bash
# In Firebase Console or app:
1. Create a new quiz
2. Set status to 'approved'
3. Check function logs:
   firebase functions:log --only onQuizCreated

# Expected: "✅ Added quiz {id} to vector index"
```

**Test Update:**
```bash
# Edit quiz title
1. Change quiz title in Firestore
2. Wait 2 minutes (debounce)
3. Check logs:
   firebase functions:log --only onQuizUpdated

# Expected: "🔄 Processing debounced update"
```

**Test Delete:**
```bash
# Delete quiz
1. Delete quiz document
2. Check logs:
   firebase functions:log --only onQuizDeleted

# Expected: "✅ Removed quiz {id} from vector index"
```

#### **Step 3: Monitor Performance**
```bash
# Check Firebase Console > Functions > Metrics
- Invocations should increase
- Error rate should be < 1%
- Execution time should be < 10s
```

---

### **WEEK 3: Enable Queue (Phase 2.3)**

#### **Step 1: Update Triggers to Use Queue**

Modify triggers to enqueue instead of direct processing:

```typescript
// functions/src/triggers/onQuizCreated.ts
import { enqueueIndexUpdate } from '../lib/indexQueue';

export const onQuizCreated = ...onCreate(async (snapshot, context) => {
  // Enqueue instead of direct process
  await enqueueIndexUpdate({
    type: 'create',
    quizId: context.params.quizId,
    quizData: snapshot.data(),
  });
});
```

#### **Step 2: Deploy Queue Processor**
```bash
firebase deploy --only \
  functions:processIndexQueueScheduled,\
  functions:cleanupIndexQueueDaily,\
  functions:triggerQueueProcessing
```

#### **Step 3: Monitor Queue**

**Check queue stats:**
```typescript
// In Functions shell or callable endpoint
const stats = await getQueueStats();
console.log(stats);
// { pending: 5, processing: 0, completed: 100, failed: 0 }
```

**Manual trigger (if needed):**
```bash
# Call from Admin UI or:
firebase functions:call triggerQueueProcessing --data '{"batchSize": 50}'
```

#### **Step 4: Set Up Alerts**

In Firebase Console > Functions > Metrics:
- Alert if `processIndexQueueScheduled` errors > 5/hour
- Alert if queue size (`pending`) > 100

---

### **WEEK 4: Optimization (Phase 2.4)**

#### **Step 1: Deploy Optimizations**
```bash
# Cache and monitoring already integrated
firebase deploy --only functions
```

#### **Step 2: Verify Cache Working**

Check logs for:
```
✅ Using cached index
```

Instead of:
```
📥 Loading index from Storage (cache miss)...
```

#### **Step 3: Set Up Weekly Re-sync**

Add to cron jobs:
```bash
# Every Sunday at 2 AM
0 2 * * 0 /path/to/npm run resync:index
```

Or deploy as scheduled function:
```typescript
// functions/src/scheduled/weeklyResync.ts
export const weeklyResync = functions
  .pubsub.schedule('0 2 * * 0')
  .onRun(async () => {
    // Run resync logic
  });
```

---

## 📊 MONITORING & MAINTENANCE

### **Daily Checks**

```bash
# Check queue stats
npm run check:queue

# Check index metrics
npm run check:metrics

# Check for failures
npm run check:failures
```

### **Weekly Tasks**

```bash
# Run consistency check
npm run resync:index

# Review performance metrics
# Firebase Console > Functions > Metrics

# Clean up old queue items (auto-scheduled)
```

### **Monthly Tasks**

```bash
# Analyze costs
# Firebase Console > Usage > Storage & Functions

# Review and optimize
# - Check average function duration
# - Identify slow triggers
# - Optimize large index sizes
```

---

## 🔧 TROUBLESHOOTING

### **Problem: Chatbot returns stale data**

**Diagnosis:**
```bash
# Check cache stats
firebase functions:call getCacheStats
```

**Solution:**
```bash
# Manually invalidate cache
firebase functions:call invalidateCache

# Or wait 5 minutes for auto-expiry
```

---

### **Problem: Queue backlog growing**

**Diagnosis:**
```bash
# Check queue stats
firebase functions:call getQueueStats
```

**Solution:**
```bash
# Manual batch process
firebase functions:call triggerQueueProcessing --data '{"batchSize": 100}'

# Check for errors
firebase functions:log --only processIndexQueueScheduled --limit 50
```

---

### **Problem: Index inconsistency detected**

**Diagnosis:**
```bash
npm run resync:index
```

**Output:**
```
⚠️  Missing from index:     5
⚠️  Extra in index:         2
```

**Solution:**
```bash
# Force rebuild
npm run resync:index -- --force
```

---

### **Problem: High function costs**

**Diagnosis:**
```bash
# Check invocation counts
# Firebase Console > Functions > Usage

# Identify most expensive functions
```

**Solution:**
1. Increase cache TTL (5min → 15min)
2. Increase debounce time (2min → 5min)
3. Reduce queue processing frequency (1min → 5min)

---

## 📈 PERFORMANCE TARGETS

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Index update latency | < 10s | > 30s |
| Embedding success rate | > 99% | < 95% |
| Queue processing time | < 5 min | > 15 min |
| Cache hit rate | > 80% | < 50% |
| Function error rate | < 1% | > 5% |
| Monthly cost | < $10 | > $50 |

---

## 🎯 SUCCESS CRITERIA

Phase 2 deployment is successful when:

- ✅ Index updates within 10 seconds of quiz change
- ✅ Zero data loss during concurrent updates
- ✅ Chatbot always returns latest data
- ✅ Queue processes all tasks within 5 minutes
- ✅ Weekly consistency check passes
- ✅ Monthly costs < $10 for 1000 updates/day
- ✅ 99.9% trigger success rate

---

## 📞 ROLLBACK PLAN

If Phase 2 causes issues:

### **Immediate Rollback (< 5 minutes)**

```bash
# 1. Disable triggers
firebase functions:delete onQuizCreated
firebase functions:delete onQuizUpdated  
firebase functions:delete onQuizDeleted

# 2. Revert askRAG to use Firestore
# (Keep backup of old askRAG function)
firebase deploy --only functions:askRAG

# 3. Restore old index from backup
# (Use Firestore document backup)
```

### **Graceful Rollback (< 1 hour)**

```bash
# 1. Process remaining queue
firebase functions:call triggerQueueProcessing --data '{"batchSize": 1000}'

# 2. Export current index as backup
npm run backup:index:storage

# 3. Disable scheduled functions
firebase functions:delete processIndexQueueScheduled

# 4. Revert to manual batch processing
# Use old buildVectorIndex.ts script
```

---

## 📚 RESOURCES

- **Architecture:** `PHASE2_AUTOMATION_PLAN.md`
- **Troubleshooting:** `CHATBOT_TROUBLESHOOTING.md`
- **Scripts:**
  - `npm run build:index` - Build index locally
  - `npm run upload:index` - Upload to Storage
  - `npm run resync:index` - Check consistency
  - `npm run check:queue` - Queue stats
  - `npm run check:metrics` - Performance metrics

- **Functions:**
  - `migrateIndexToStorage` - One-time migration
  - `onQuizCreated/Updated/Deleted` - Auto triggers
  - `processIndexQueueScheduled` - Queue processor
  - `triggerQueueProcessing` - Manual trigger

---

**Last Updated:** 2025-11-24  
**Version:** 2.0  
**Status:** Ready for Deployment
