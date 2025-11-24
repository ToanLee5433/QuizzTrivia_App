# ✅ Test Checklist - Offline Mode Fixes

## 🎯 Testing Objectives
1. ✅ Verify storage decreases when deleting quiz
2. ✅ Verify quiz can be played completely offline
3. ✅ Verify Service Worker caches all chunks
4. ✅ Verify chunk preloader works

---

## 📋 Test Case 1: Storage Cleanup

### Preconditions
- User is logged in
- At least 1 quiz is downloaded

### Steps
1. **Check Initial Storage**
   ```javascript
   // Open DevTools Console
   const storage = await navigator.storage.estimate();
   const initialUsage = storage.usage;
   console.log(`Initial: ${(initialUsage / 1024 / 1024).toFixed(2)} MB`);
   ```

2. **Check Cache Storage**
   ```javascript
   const cache = await caches.open('quiz-trivia-v1.2.0');
   const initialCacheSize = (await cache.keys()).length;
   console.log(`Cache items: ${initialCacheSize}`);
   ```

3. **Delete a Quiz**
   - Go to `/downloaded-quizzes`
   - Click delete button on any quiz
   - Confirm deletion

4. **Verify Storage Decreased**
   ```javascript
   const newStorage = await navigator.storage.estimate();
   const newUsage = newStorage.usage;
   console.log(`New: ${(newUsage / 1024 / 1024).toFixed(2)} MB`);
   console.log(`Freed: ${((initialUsage - newUsage) / 1024 / 1024).toFixed(2)} MB`);
   
   // Cache should also decrease
   const newCacheSize = (await cache.keys()).length;
   console.log(`Cache items now: ${newCacheSize} (was ${initialCacheSize})`);
   ```

### Expected Results
- ✅ Storage usage MUST decrease (at least by quiz size)
- ✅ Cache Storage item count MUST decrease
- ✅ Console logs show "🗑️ Deleted X media from IndexedDB"
- ✅ Console logs show "🗑️ Deleted X media from Cache Storage"

---

## 📋 Test Case 2: Offline Quiz Playback (Fresh User)

### Scenario: New User, Never Visited QuizPage

### Preconditions
- Clear all data (Application → Clear Storage)
- Fresh login
- Internet connection ON

### Steps

#### Phase 1: Initial Setup (ONLINE)
1. **Login**
2. **Wait 5 seconds** (for chunk preloader)
   - Check Console: Should see `[ChunkPreloader] 🚀 Starting...`
   - Check Console: Should see `[ChunkPreloader] ✅ Preload complete`

3. **Download a Quiz**
   - Go to Quiz List
   - Click "⬇️ Tải về" on any quiz
   - Wait for 100% progress
   - Verify toast: "✅ Đã tải thành công"

4. **Verify Chunks Cached**
   ```javascript
   const cache = await caches.open('quiz-trivia-v1.2.0');
   const requests = await cache.keys();
   const jsChunks = requests.filter(r => r.url.includes('.js'));
   console.log(`Cached ${jsChunks.length} JS chunks`);
   
   // MUST see QuizPage chunk
   const hasQuizPage = jsChunks.some(r => r.url.includes('QuizPage'));
   console.log(`Has QuizPage chunk: ${hasQuizPage}`);
   ```

#### Phase 2: Go OFFLINE
5. **Enable Offline Mode**
   - DevTools → Network tab → Check "Offline"
   - OR: Airplane mode

6. **Navigate to Downloaded Quizzes**
   - Go to `/downloaded-quizzes`
   - Should load WITHOUT errors

7. **Play Quiz Offline**
   - Click "Chơi Ngay" on downloaded quiz
   - **CRITICAL**: Quiz page MUST load (no white screen, no crash)
   - Questions MUST render
   - Images MUST load
   - Timer MUST work

8. **Complete Quiz**
   - Answer all questions
   - Submit answers
   - View results

### Expected Results
- ✅ NO console errors about "Failed to fetch dynamically imported module"
- ✅ QuizPage loads successfully
- ✅ All quiz features work offline
- ✅ Images load from IndexedDB Blobs
- ✅ No white screen / crash

---

## 📋 Test Case 3: Offline Quiz Playback (Existing User)

### Scenario: User Already Has Cache

### Steps
1. **Start with existing cache** (from Test Case 2)
2. **Clear ONLY IndexedDB**
   ```javascript
   // Keep Service Worker cache, only clear quiz data
   indexedDB.deleteDatabase('QuizOfflineDB');
   location.reload();
   ```
3. **Go OFFLINE**
4. **Try to play downloaded quiz**

### Expected Results
- ✅ Quiz data missing → Shows "Quiz not found" error
- ✅ App DOES NOT crash
- ✅ QuizPage chunk still loads (from SW cache)
- ✅ Graceful error handling

---

## 📋 Test Case 4: Chunk Preloader

### Steps
1. **Clear all caches**
   ```javascript
   await navigator.serviceWorker.getRegistrations().then(regs => 
     Promise.all(regs.map(r => r.unregister()))
   );
   await caches.keys().then(keys => 
     Promise.all(keys.map(k => caches.delete(k)))
   );
   location.reload();
   ```

2. **Login and wait**
3. **Monitor Console** (within 5 seconds)
   - Should see: `[App] 🚀 Starting background chunk preload...`
   - Should see: `[ChunkPreloader] ✓ Loaded 1/8`
   - Should see: `[ChunkPreloader] ✓ Loaded 2/8`
   - ...
   - Should see: `[ChunkPreloader] ✅ Preload complete`

4. **Verify localStorage**
   ```javascript
   localStorage.getItem('chunks_preloaded_at');
   // Should return timestamp
   ```

5. **Verify cache**
   ```javascript
   const cache = await caches.open('quiz-trivia-v1.2.0');
   const jsChunks = (await cache.keys()).filter(r => r.url.includes('.js'));
   console.log(`Preloaded ${jsChunks.length} JS chunks`);
   ```

### Expected Results
- ✅ Preloader runs automatically after 3s
- ✅ All lazy chunks are loaded
- ✅ QuizPage, CreateQuizPage, EditQuizPage chunks cached
- ✅ localStorage flag set

---

## 📋 Test Case 5: Clear All Downloads

### Steps
1. **Download 2-3 quizzes**
2. **Check storage before**
   ```javascript
   const before = await navigator.storage.estimate();
   console.log(`Before: ${(before.usage / 1024 / 1024).toFixed(2)} MB`);
   ```

3. **Click "Xóa Tất Cả"**
4. **Confirm**

5. **Check storage after**
   ```javascript
   const after = await navigator.storage.estimate();
   console.log(`After: ${(after.usage / 1024 / 1024).toFixed(2)} MB`);
   console.log(`Freed: ${((before.usage - after.usage) / 1024 / 1024).toFixed(2)} MB`);
   ```

6. **Verify Cache Storage cleared**
   ```javascript
   const cache = await caches.open('quiz-trivia-v1.2.0');
   const items = await cache.keys();
   console.log(`Cache items: ${items.length}`);
   // Should be much smaller (only app shell remains)
   ```

### Expected Results
- ✅ All quizzes deleted from UI
- ✅ Storage usage drops significantly
- ✅ Cache Storage cleared (except app shell)
- ✅ Console: "Cleared X downloaded quizzes + media (IndexedDB + Cache Storage)"

---

## 📋 Test Case 6: Service Worker Update

### Steps
1. **Check current SW version**
   - DevTools → Application → Service Workers
   - Should see `quiz-trivia-v1.2.0` status "activated"

2. **Force update** (if old version)
   ```javascript
   const regs = await navigator.serviceWorker.getRegistrations();
   await Promise.all(regs.map(r => r.update()));
   location.reload();
   ```

3. **Verify new version**
   - Check CACHE_NAME in sw.js
   - Should be `quiz-trivia-v1.2.0`

### Expected Results
- ✅ Service Worker version is v1.2.0
- ✅ Old cache deleted automatically
- ✅ New cache created

---

## 🐛 Bug Scenarios

### Scenario A: User Downloads Quiz Before Chunks Preload
**Reproduction**:
1. Login
2. IMMEDIATELY download quiz (within 3s, before preloader runs)
3. Go offline
4. Try to play

**Expected**: 
- ✅ Quiz MIGHT not work (chunks not preloaded yet)
- ✅ Error message: "Offline - Resource not cached"
- ✅ No crash, graceful fallback

**Fix**: 
- Wait 5s after login before downloading
- OR: Visit quiz page once while online

### Scenario B: Slow Network During Preload
**Reproduction**:
1. Throttle network (Slow 3G)
2. Login
3. Watch preloader

**Expected**:
- ✅ Preloader continues (may take longer)
- ✅ Some chunks may fail (logged as warning)
- ✅ No crash

---

## ✅ Acceptance Criteria

### Must Pass
- [ ] Test Case 1: Storage decreases when deleting quiz
- [ ] Test Case 2: Fresh user can play quiz offline
- [ ] Test Case 4: Chunk preloader runs automatically
- [ ] Test Case 5: Clear all downloads works

### Should Pass
- [ ] Test Case 3: Graceful handling of missing data
- [ ] Test Case 6: Service Worker updates correctly

### Nice to Have
- [ ] Bug Scenario A: Graceful fallback
- [ ] Bug Scenario B: Works on slow network

---

## 📝 Notes for Testing

1. **Always check Console** for errors and logs
2. **Use DevTools Network tab** to verify offline mode
3. **Monitor Application → Storage** to see actual data
4. **Test on different browsers** (Chrome, Edge, Firefox)
5. **Test on mobile** (if possible)

---

## 🔧 Debugging Commands

```javascript
// Check Service Worker status
navigator.serviceWorker.getRegistrations().then(regs => 
  regs.forEach(r => console.log(r.active?.scriptURL, r.active?.state))
);

// Check cache
caches.keys().then(keys => console.log('Caches:', keys));

// Check storage
navigator.storage.estimate().then(est => 
  console.log(`${(est.usage/1024/1024).toFixed(2)}MB / ${(est.quota/1024/1024).toFixed(2)}MB`)
);

// Check preload status
console.log('Chunks preloaded:', localStorage.getItem('chunks_preloaded_at'));

// Force preload
import('./lib/services/chunkPreloader').then(m => m.forcePreloadChunks());
```

---

**Happy Testing! 🎉**
