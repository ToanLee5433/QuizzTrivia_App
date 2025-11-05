# 🔒 Quiz Password Protection - Quick Reference

## 🚀 Quick Start

### Create Password-Protected Quiz

```typescript
// In CreateQuizPage - form already handles this
// User selects "Password" option
// Enter password in input field
// On submit, password automatically hashed and saved
```

### Access Password-Protected Quiz

```typescript
// Automatic flow:
// 1. User clicks quiz → Password modal appears
// 2. User enters password → System verifies
// 3. Correct password → Access granted, modal closes
// 4. Wrong password → Error shown, can retry
```

---

## 📋 Data Structure

```typescript
// Quiz with password
{
  title: "My Protected Quiz",
  visibility: "password",     // "public" | "password"
  pwd: {
    enabled: true,
    algo: "SHA256",
    salt: "base64_random_salt",
    hash: "sha256_hash"
  },
  // ... other fields
}

// Access token (created when password correct)
quizzes/{quizId}/access/{userId} = {
  proofHash: "sha256_proof",
  unlockedAt: timestamp,
  userId: "user_id"
}
```

---

## 🔧 Common Tasks

### Check if Quiz Has Password

```typescript
// Method 1: Check visibility
if (quiz.visibility === 'password') {
  // Has password
}

// Method 2: Support old format
if (quiz.visibility === 'password' || quiz.havePassword === 'password') {
  // Has password (backward compatible)
}
```

### Check if User Has Access

```typescript
import { hasQuizAccess } from '@/lib/services/quizAccessService';

const hasAccess = await hasQuizAccess(quizId, userId);
if (hasAccess) {
  // User unlocked this quiz
}
```

### Manually Unlock Quiz

```typescript
import { unlockQuiz } from '@/lib/services/quizAccessService';

const success = await unlockQuiz(quizId, userId, password, quizMetadata);
if (success) {
  console.log('Quiz unlocked!');
}
```

### Load Quiz Metadata (Always Works)

```typescript
import { getQuizMetadata } from '@/lib/services/quizAccessService';

const metadata = await getQuizMetadata(quizId);
// Returns: { id, title, description, visibility, pwd, ... }
```

### Test Questions Access

```typescript
import { canAccessQuestions } from '@/lib/services/quizAccessService';

const canAccess = await canAccessQuestions(quizId, userId);
if (canAccess) {
  // Can read questions
} else {
  // Blocked - need password
}
```

### Remove Access (Admin)

```typescript
import { removeQuizAccess } from '@/lib/services/quizAccessService';

await removeQuizAccess(quizId, userId);
// User must re-enter password
```

---

## 🧪 Testing Commands

```bash
# Dry run migration (preview changes)
node scripts/migrateQuizPasswords.mjs --dry-run

# Execute migration
node scripts/migrateQuizPasswords.mjs --force

# Check Firestore rules
firebase deploy --only firestore:rules

# Run dev server
npm run dev
```

---

## 🐛 Debugging

### Check Password Hash

```javascript
// In browser console
import { createPasswordHash } from './src/lib/utils/passwordHash';
const { salt, hash } = await createPasswordHash('test123');
console.log('Salt:', salt);
console.log('Hash:', hash);
```

### Check Quiz Visibility

```javascript
// In Firestore console
quizzes/{quizId}
  → visibility: "password" ✅
  → pwd: { enabled, algo, salt, hash } ✅
```

### Check Access Token

```javascript
// In Firestore console
quizzes/{quizId}/access/{userId}
  → proofHash: "..." ✅
  → unlockedAt: timestamp ✅
```

### Check Rules

```bash
# View current rules
firebase firestore:rules:read

# Test rules locally
firebase emulators:start --only firestore
```

---

## ⚡ Quick Fixes

### Problem: Password modal doesn't show
```typescript
// Check useQuizData hook
const { needsPassword, quizMetadata } = useQuizData(quizId);
console.log('Needs password?', needsPassword);
console.log('Metadata:', quizMetadata);
```

### Problem: Wrong password accepted
```typescript
// Check Firestore rules deployed
firebase deploy --only firestore:rules

// Check pwd.hash in database
// Should be 64-char hex string (SHA-256)
```

### Problem: Access denied after correct password
```typescript
// Check access token created
const hasAccess = await hasQuizAccess(quizId, userId);
console.log('Has access?', hasAccess);

// Check Firestore console
// quizzes/{quizId}/access/{userId} should exist
```

---

## 📖 Full Documentation

- **Complete Guide:** [QUIZ_PASSWORD_PROTECTION.md](../QUIZ_PASSWORD_PROTECTION.md)
- **Architecture:** See "Architecture" section in guide
- **Security Model:** See "Security Model" section in guide
- **Testing Checklist:** 7 test scenarios in guide
- **Troubleshooting:** Detailed solutions in guide

---

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `src/lib/utils/passwordHash.ts` | SHA-256 utilities |
| `src/lib/services/quizAccessService.ts` | Access control logic |
| `src/shared/components/ui/QuizPasswordModal.tsx` | Password UI |
| `src/features/quiz/pages/QuizPage/index.tsx` | Quiz page integration |
| `src/features/quiz/pages/CreateQuizPage/index.tsx` | Create page integration |
| `src/features/quiz/components/QuizCard.tsx` | Password badge |
| `firestore.rules` | Security rules |
| `scripts/migrateQuizPasswords.mjs` | Migration script |

---

**Need Help?** Check [QUIZ_PASSWORD_PROTECTION.md](../QUIZ_PASSWORD_PROTECTION.md) for detailed documentation.
