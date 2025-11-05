# 🧪 Quiz Password Protection - Testing Guide

## 📋 Overview

Complete testing guide for quiz password protection feature. Follow all scenarios to ensure system works correctly.

---

## ✅ Test Scenario 1: Create Public Quiz

### Steps
1. Navigate to Create Quiz page (`/create-quiz`)
2. Fill in basic info:
   - Title: "Public Test Quiz"
   - Description: "This is a public quiz"
   - Category: "General"
   - Difficulty: "Easy"
3. **Important:** Select "Public" (havePassword = 'public')
4. Add at least 1 question
5. Click Submit

### Expected Results
- ✅ Success toast: "Quiz created successfully"
- ✅ Redirected to quiz list
- ✅ New quiz appears in list
- ❌ No 🔒 badge on quiz card

### Verify in Firestore
```
quizzes/{newQuizId}
  ├─ title: "Public Test Quiz"
  ├─ visibility: "public"
  ├─ pwd: undefined (or null)
  └─ questions: [ ... ]
```

### Verify Access
1. Click on quiz from list
2. Should load immediately without password modal
3. Questions visible right away

---

## 🔒 Test Scenario 2: Create Password Quiz

### Steps
1. Navigate to Create Quiz page
2. Fill in basic info:
   - Title: "Password Test Quiz"
   - Description: "This quiz requires password"
   - Category: "General"
   - Difficulty: "Easy"
3. **Important:** Select "Password" (havePassword = 'password')
4. Enter password: **"test123"** (remember this!)
5. Add at least 1 question
6. Click Submit

### Expected Results
- ✅ Success toast: "Quiz created successfully"
- ✅ Redirected to quiz list
- ✅ New quiz appears in list
- ✅ **🔒 badge** visible on quiz card (both grid and list view)

### Verify in Firestore
```
quizzes/{newQuizId}
  ├─ title: "Password Test Quiz"
  ├─ visibility: "password"
  ├─ pwd: {
  │   ├─ enabled: true
  │   ├─ algo: "SHA256"
  │   ├─ salt: "base64_string" (32+ chars)
  │   └─ hash: "hex_string" (64 chars)
  │   }
  └─ questions: [ ... ]
```

**Critical Checks:**
- ❌ No plain `password` field in document
- ✅ `pwd.salt` is different each time (random)
- ✅ `pwd.hash` is 64-character hex string

---

## 🚫 Test Scenario 3: Wrong Password

### Prerequisites
- Password quiz created (scenario 2)
- User logged in
- **No access token** for this quiz yet

### Steps
1. Navigate to quiz list
2. Find "Password Test Quiz" (has 🔒 badge)
3. Click on quiz
4. Password modal appears
5. Enter **wrong password:** "wrong123"
6. Click Submit

### Expected Results
- ❌ Error message: "Mật khẩu không đúng" (or similar)
- 🔄 Modal stays open
- ❌ Questions NOT loaded
- ❌ Quiz content NOT visible

### Verify in Firestore
```
quizzes/{quizId}/access/{userId}
  → Should NOT exist
```

### Verify in Console
```javascript
// Browser console should show:
// Error: permission-denied
// (Firestore rules rejected access token creation)
```

### Retry Test
1. Modal still open
2. Enter wrong password again: "wrongagain"
3. Click Submit
4. Same error message
5. Can retry unlimited times

---

## ✅ Test Scenario 4: Correct Password

### Prerequisites
- Same quiz from scenario 3
- Password modal still open (or reload page to show again)

### Steps
1. Password modal open
2. Enter **correct password:** "test123"
3. Click Submit

### Expected Results
- ✅ Success toast: "Đã mở khóa quiz!" (or similar)
- ✅ Modal closes automatically
- ✅ Questions load successfully
- ✅ Quiz content visible
- ✅ Can take quiz normally

### Verify in Firestore
```
quizzes/{quizId}/access/{userId}
  ├─ proofHash: "64_char_hex_string"
  ├─ unlockedAt: timestamp
  └─ userId: "{userId}"
```

**Critical Checks:**
- ✅ `proofHash` is 64-character hex string (SHA-256)
- ✅ `unlockedAt` is Firebase timestamp
- ✅ `userId` matches current user

### Verify proofHash Calculation
```javascript
// In browser console:
import { sha256 } from './src/lib/utils/passwordHash';

// Get salt from quiz metadata
const salt = quizMetadata.pwd.salt;

// Calculate proof
const proofHash = await sha256(salt + ':' + 'test123');

// Should match access token proofHash
console.log('Proof hash:', proofHash);
console.log('Matches?', proofHash === accessDoc.proofHash);
```

---

## 🔄 Test Scenario 5: Access Persistence

### Prerequisites
- Quiz unlocked in scenario 4
- Access token exists in Firestore

### Steps
1. While viewing quiz, navigate away (e.g., go to home)
2. Navigate back to quiz list
3. Click on same "Password Test Quiz"

### Expected Results
- ❌ Password modal does NOT appear
- ✅ Quiz loads immediately
- ✅ Questions visible right away
- ✅ Same as public quiz access

### Browser Reload Test
1. While viewing quiz, press F5 (reload)
2. Page reloads

**Expected:**
- ✅ Quiz loads immediately
- ❌ No password modal

### Close Browser Test
1. Close all browser tabs
2. Open browser again
3. Login to app
4. Navigate to quiz

**Expected:**
- ✅ Quiz loads immediately
- ✅ Access persists across sessions

### Why?
Access token stored in Firestore, not browser storage. As long as document exists in `quizzes/{quizId}/access/{userId}`, user has access.

---

## 👥 Test Scenario 6: Different User

### Prerequisites
- Quiz unlocked by User A (scenario 4)
- Access token exists for User A

### Steps
1. Log out from User A account
2. Log in with **different account** (User B)
3. Navigate to quiz list
4. Click on same "Password Test Quiz"

### Expected Results
- 🔒 Password modal appears
- ❌ User A's access does NOT work for User B
- 🔐 Must enter password again

### Test Wrong Password
1. Enter wrong password
2. Click Submit
3. Error message shown

### Test Correct Password
1. Enter correct password: "test123"
2. Click Submit
3. Success - quiz unlocked for User B

### Verify in Firestore
```
quizzes/{quizId}/access/
  ├─ {userA_id}  → User A's access token
  └─ {userB_id}  → User B's access token (newly created)
```

**Critical:**
- ✅ Each user has separate access token
- ✅ Access is per-user, not global

---

## 🗑️ Test Scenario 7: Remove Access (Admin)

### Prerequisites
- Quiz unlocked (access token exists)
- Admin privileges (optional - for advanced testing)

### Steps (Manual via Firestore Console)
1. Go to Firestore console
2. Navigate to `quizzes/{quizId}/access/{userId}`
3. Delete the access document
4. Return to app
5. Reload quiz page

### Expected Results
- 🔒 Password modal appears again
- ❌ Previous access revoked
- 🔐 Must re-enter password

### Programmatic Test
```typescript
import { removeQuizAccess } from '@/lib/services/quizAccessService';

// Remove access
await removeQuizAccess(quizId, userId);

// Try access again
const hasAccess = await hasQuizAccess(quizId, userId);
console.log('Has access?', hasAccess); // Should be false
```

---

## 🔄 Test Scenario 8: Migration Script

### Prerequisites
- Old quizzes with `havePassword: 'password'` and plain `password` field

### Steps
1. **Dry Run First:**
   ```bash
   node scripts/migrateQuizPasswords.mjs --dry-run
   ```

2. **Review Output:**
   - Check number of quizzes to migrate
   - Verify quiz titles
   - Check salt/hash preview

3. **Execute Migration:**
   ```bash
   node scripts/migrateQuizPasswords.mjs --force
   ```

4. **Verify in Firestore:**
   - Old quizzes now have `visibility: 'password'`
   - Old quizzes now have `pwd: { enabled, algo, salt, hash }`
   - Plain `password` field may still exist (backward compat)

### Expected Results
- ✅ All old password quizzes migrated
- ✅ New `visibility` field added
- ✅ New `pwd` object created
- ✅ Passwords hashed with SHA-256
- ✅ 🔒 badge appears on old quizzes

### Test Old Quiz Access
1. Find migrated quiz in list
2. Click on quiz
3. Password modal appears
4. Enter **OLD password** (plain text from before migration)
5. Click Submit

**Expected:**
- ✅ Access granted (hash matches)
- ✅ Quiz unlocked
- ✅ Works same as new password quizzes

---

## 🎯 Testing Checklist

### Basic Functionality
- [ ] Create public quiz → No password, loads immediately
- [ ] Create password quiz → Has 🔒 badge
- [ ] Wrong password → Error message, modal stays open
- [ ] Correct password → Success, modal closes, quiz loads
- [ ] Access persistence → Reload page, still works

### Security
- [ ] Plain password NOT stored in Firestore
- [ ] `pwd.hash` is 64-char hex (SHA-256)
- [ ] `pwd.salt` is random (different each quiz)
- [ ] Access token `proofHash` matches `pwd.hash`
- [ ] Wrong password rejected by Firestore rules

### UI/UX
- [ ] 🔒 badge visible on password quizzes (grid view)
- [ ] 🔒 badge visible on password quizzes (list view)
- [ ] Password modal has show/hide toggle (Eye icon)
- [ ] Error message clear and actionable
- [ ] Success toast appears on unlock

### Multi-User
- [ ] Different users need separate passwords
- [ ] Access tokens separate per user
- [ ] Owner can always access (no password needed)

### Edge Cases
- [ ] Empty password → Validation error
- [ ] Very long password (100+ chars) → Works
- [ ] Special characters in password → Works
- [ ] Unicode/emoji in password → Works
- [ ] Delete access token → Must re-enter password

### Migration
- [ ] Dry run shows correct preview
- [ ] Migration completes without errors
- [ ] Old quizzes have new structure
- [ ] Old passwords still work after migration

---

## 🐛 Common Issues & Solutions

### Issue: Modal doesn't appear
**Check:**
- Quiz has `visibility: 'password'`
- Firestore rules deployed
- useQuizData hook imported
- QuizPage rendering modal when `needsPassword === true`

**Debug:**
```javascript
console.log('Quiz metadata:', quizMetadata);
console.log('Needs password?', needsPassword);
```

### Issue: Wrong password accepted
**Check:**
- `createPasswordHash()` using correct algorithm
- Firestore rules comparing proofHash correctly
- No client-side validation bypassing server rules

**Debug:**
```javascript
const { salt, hash } = await createPasswordHash('test123');
console.log('Expected hash:', hash);
console.log('Actual hash:', quizMetadata.pwd.hash);
```

### Issue: Access denied after correct password
**Check:**
- Access token created in Firestore
- Token has correct `proofHash`
- Firestore rules allow questions read with access token

**Debug:**
```javascript
const hasAccess = await hasQuizAccess(quizId, userId);
console.log('Has access?', hasAccess);
```

### Issue: Badge not showing
**Check:**
- QuizCard component updated
- Quiz has `visibility: 'password'` OR `havePassword: 'password'`
- Component re-rendered after data load

**Debug:**
```javascript
console.log('Quiz visibility:', quiz.visibility);
console.log('Quiz havePassword:', quiz.havePassword);
```

---

## 📊 Performance Testing

### Load Test
1. Create 10+ password quizzes
2. Load quiz list
3. Check load time
4. **Expected:** < 2 seconds

### Access Check Performance
1. User has 100+ access tokens
2. Load any quiz
3. Check access detection time
4. **Expected:** < 500ms

### Batch Migration
1. Database with 1000+ quizzes
2. Run migration script
3. Monitor progress
4. **Expected:** ~100 quizzes/minute

---

## ✅ Success Criteria

All tests pass when:
- ✅ Public quizzes load immediately
- ✅ Password quizzes show modal
- ✅ Wrong password rejected
- ✅ Correct password grants access
- ✅ Access persists across sessions
- ✅ Different users need separate passwords
- ✅ No plain passwords in database
- ✅ Firestore rules enforce security
- ✅ Migration script works correctly
- ✅ UI shows 🔒 badge correctly

---

**Questions?** Check [QUIZ_PASSWORD_PROTECTION.md](../QUIZ_PASSWORD_PROTECTION.md) for troubleshooting.
