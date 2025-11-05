# 📌 Firebase Data Strategy - Quick Reference

## 🎯 **DECISION MATRIX**

Cần lưu data? Hỏi 3 câu:

### **1. Data có cần BỀN VỮNG không?** ⏰
- ✅ **YES** → Firestore
- ❌ **NO** (tạm thời < 1 hour) → RTDB

### **2. Data có cần QUERY PHỨC TẠP không?** 🔍
- ✅ **YES** (filter, sort, pagination) → Firestore
- ❌ **NO** (simple key-value) → RTDB

### **3. Update TẦN SUẤT CAO không?** ⚡
- ✅ **YES** (> 1 lần/giây) → RTDB
- ❌ **NO** → Firestore

---

## 📊 **USE CASE MAPPING**

| Feature | Storage | Why |
|---------|---------|-----|
| **Quiz metadata** | Firestore | Bền + Query |
| **Questions** | Firestore | Bền + Protected |
| **User profiles** | Firestore | Bền + Query |
| **Quiz results** | Firestore | Bền + History |
| **Learning progress** | Firestore | Bền + Tracking |
| | |
| **Multiplayer lobby** | RTDB | Real-time + Presence |
| **Game timer** | RTDB | High frequency |
| **Live scores** | RTDB | Real-time leaderboard |
| **Chat messages** | RTDB | Instant delivery |
| **Player presence** | RTDB | Online/offline status |
| | |
| **Question images** | Storage | Binary files |
| **PDF resources** | Storage | Large files |
| **User avatars** | Storage | Images |

---

## 🔄 **DATA FLOW EXAMPLES**

### **Practice Quiz (Solo)**

```
User → Fetch metadata (Firestore)
     → Fetch questions (Firestore, with rules)
     → Do quiz locally (IndexedDB cache)
     → Submit result (Firestore)
```

**Cost:** ~$0.001 per quiz

---

### **Multiplayer Game**

```
1. Host creates room → Firestore (config) + RTDB (init state)
2. Players join → RTDB (presence + ready status)
3. Game starts → RTDB (countdown 3-2-1)
4. Show question → RTDB (state.currentQuestionIndex)
5. Players answer → Firestore (submissions, immutable)
6. Update scores → RTDB (live leaderboard)
7. Next question → RTDB (state update)
8. Game ends → Firestore (final results)
9. Cleanup → RTDB (delete room after 30min)
```

**Cost:** ~$0.005 per game (79% cheaper than Firestore-only)

---

## 🛡️ **SECURITY RULES - TLDR**

### **Firestore**

```javascript
// Quiz metadata: Status-based
read: if status == 'approved' || isOwner || isAdmin

// Questions: Status + Visibility + Password
read: if (approved && public) || 
         (approved && password && hasAccess) || 
         isOwner || 
         isAdmin

// Results: Owner + Quiz creator
read: if isOwner || isQuizCreator || isAdmin
```

### **RTDB**

```json
{
  "/rooms/$roomId/state": {
    "write": "auth.uid === host"
  },
  "/rooms/$roomId/presence/$uid": {
    "write": "auth.uid === $uid"
  },
  "/rooms/$roomId/players/$uid": {
    "write": "auth.uid === $uid"
  }
}
```

---

## 💰 **COST COMPARISON**

### **Before (Firestore only)**

| Operation | Count/month | Cost |
|-----------|-------------|------|
| Quiz reads | 100K | $6.00 |
| Game state updates | 50K writes | $9.00 |
| Player status | 100K writes | $18.00 |
| **Total** | | **$33/month** |

### **After (Hybrid)**

| Operation | Count/month | Cost |
|-----------|-------------|------|
| Quiz reads | 100K | $6.00 |
| Final results | 5K writes | $0.90 |
| RTDB (all live) | 150K ops | $0.00 |
| **Total** | | **$6.90/month** |

**Savings: $26.10/month (79%)** 🎉

---

## 📁 **PATH CONVENTIONS**

### **Firestore**

```
quizzes/{quizId}                        → Config
quizzes/{quizId}/questions/{qid}        → Content
quizzes/{quizId}/access/{uid}           → Unlock tokens
quizzes/{quizId}/resources/{rid}        → Learning materials

multiplayer_rooms/{roomId}              → Room config
multiplayer_rooms/{roomId}/submissions  → Immutable answers

quizResults/{resultId}                  → Final scores
users/{uid}                             → Profiles
```

### **RTDB**

```
/rooms/{roomId}/state                   → Game state
/rooms/{roomId}/presence/{uid}          → Online/offline
/rooms/{roomId}/players/{uid}           → Ready + temp scores
/rooms/{roomId}/chat/{msgId}            → Messages
/rooms/{roomId}/signals                 → Host triggers
```

### **Storage**

```
/quizzes/{quizId}/images/{file}         → Question images
/quizzes/{quizId}/resources/{file}      → PDFs
/users/{uid}/avatar.jpg                 → Profile pics
```

---

## 🚀 **MIGRATION STEPS**

1. **Analyze current data:**
   ```bash
   node scripts/migrateMultiplayerToRTDB.mjs --analyze
   ```

2. **Dry run (preview):**
   ```bash
   node scripts/migrateMultiplayerToRTDB.mjs --dry-run
   ```

3. **Execute migration:**
   ```bash
   node scripts/migrateMultiplayerToRTDB.mjs --execute
   ```

4. **Verify integrity:**
   ```bash
   node scripts/migrateMultiplayerToRTDB.mjs --verify
   ```

5. **Rollback if needed:**
   ```bash
   node scripts/migrateMultiplayerToRTDB.mjs --rollback backups/.../*.json
   ```

---

## ⚡ **PERFORMANCE TIPS**

### **Firestore**

✅ **DO:**
- Use `limit()` for pagination
- Create indexes for common queries
- Cache data locally (IndexedDB)
- Batch writes when possible

❌ **DON'T:**
- Query without limits
- Update same doc > 1/second
- Use for real-time game state

### **RTDB**

✅ **DO:**
- Use for high-frequency updates
- Implement onDisconnect() for presence
- Batch updates with single `update()` call
- Clean up ephemeral data

❌ **DON'T:**
- Store large objects (>1MB)
- Use for permanent history
- Query without indexes

### **Storage**

✅ **DO:**
- Compress images before upload
- Generate thumbnails (Cloud Functions)
- Cache download URLs
- Use YouTube for videos

❌ **DON'T:**
- Store in public bucket without rules
- Fetch download URL repeatedly
- Store large videos (>100MB)

---

## 🔗 **QUICK LINKS**

- 📖 [Full Architecture Guide](./FIREBASE_DATA_ARCHITECTURE.md)
- 🔧 [Migration Script](./scripts/migrateMultiplayerToRTDB.mjs)
- 🛡️ [Security Rules](./firestore.rules)
- 📊 [Cost Analysis](./FIREBASE_DATA_ARCHITECTURE.md#cost-analysis)

---

## 🆘 **TROUBLESHOOTING**

### **"Permission denied" in Firestore**
→ Check rules: User có quyền read/write không?  
→ Check status: Quiz có approved chưa?  
→ Check visibility: Quiz public hay password?

### **"Disconnected" trong RTDB**
→ Check network: Internet stable không?  
→ Check rules: RTDB rules có đúng không?  
→ Check quota: Database size > 1GB?

### **"Storage upload failed"**
→ Check rules: User có quyền upload không?  
→ Check size: File < 10MB?  
→ Check quota: Storage < 5GB (free tier)?

---

**TL;DR:**
- Firestore = Dữ liệu bền + Query
- RTDB = Real-time + High frequency
- Storage = Binary files
- Hybrid approach = 79% cost savings

**Version:** 1.0.0  
**Last Updated:** Nov 3, 2025
