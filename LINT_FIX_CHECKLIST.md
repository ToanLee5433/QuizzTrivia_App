# 🔧 Lint Fix Checklist - Action Plan

**Status:** 📋 Ready to Execute  
**Total Warnings:** 1016  
**Priority:** Fix P0 → P1 → P2 → P3

---

## 🔴 PHASE 1: Critical Fixes (P0) - FIX NGAY

**Deadline:** 2-3 ngày  
**Impact:** 🔴 HIGH - Có thể gây bugs nghiêm trọng

### ✅ Task 1: Fix Hook Dependencies (35 warnings)

#### 📍 AdminDashboard.tsx
- [ ] Line 25: `useEffect` missing `loadRealData`
  ```typescript
  // Fix: useEffect(() => { loadRealData(); }, [loadRealData]);
  ```

#### 📍 AdminQuizManagement.tsx  
- [ ] Line 118: `useEffect` missing `loadEditRequests`, `loadQuizzes`
  ```typescript
  // Fix: Add all dependencies or use useCallback
  ```

#### 📍 CategoryManagement.tsx
- [ ] Line 75: `useEffect` missing `loadCategories`
- [ ] Line 78: `useEffect` missing `loadCreators`
  ```typescript
  // Fix: Wrap functions in useCallback or add to deps
  ```

#### 📍 StatsDashboard.tsx
- [ ] Review all useEffect hooks
- [ ] Add missing dependencies

#### 📍 Quiz Components
- [ ] Review data fetching hooks
- [ ] Check for stale closures
- [ ] Test re-render behavior

#### 📍 Multiplayer
- [ ] Review real-time update hooks
- [ ] Check WebSocket dependencies
- [ ] Verify cleanup functions

**Testing Required:**
- [ ] Test data fetching
- [ ] Test real-time updates
- [ ] Check for memory leaks
- [ ] Verify no infinite loops
- [ ] User interaction testing

---

## 🟠 PHASE 2: Type Safety (P1) - Trong 2-4 tuần

**Impact:** 🟠 MEDIUM-HIGH - Ảnh hưởng maintainability

### ✅ Task 2: Fix Explicit Any Types (293 warnings)

#### Priority 1: API & Data Types (Estimated: 6 hours)

**Admin API Calls:**
- [ ] `src/features/admin/services/` - Add response types
  ```typescript
  interface AdminStatsResponse {
    totalUsers: number;
    totalQuizzes: number;
    // ... add all fields
  }
  ```

**Quiz API Calls:**
- [ ] `src/features/quiz/api/` - Type all responses
  ```typescript
  interface QuizResponse {
    id: string;
    title: string;
    questions: Question[];
    // ... add all fields
  }
  ```

**Firestore Documents:**
- [ ] Add interfaces for all document types
- [ ] Type converter functions
- [ ] Proper typing for collections

#### Priority 2: Event Handlers (Estimated: 4 hours)

**Form Events:**
- [ ] `onChange` handlers - type as `React.ChangeEvent<HTMLInputElement>`
- [ ] `onSubmit` handlers - type as `React.FormEvent<HTMLFormElement>`
- [ ] `onClick` handlers - type as `React.MouseEvent<HTMLButtonElement>`

**Example:**
```typescript
// ❌ Before
const handleChange = (e: any) => { ... }

// ✅ After
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
```

#### Priority 3: Component Props (Estimated: 6 hours)

**Create interfaces for:**
- [ ] Admin components props
- [ ] Quiz components props
- [ ] Multiplayer components props
- [ ] Shared components props

**Example:**
```typescript
interface QuizCardProps {
  quiz: Quiz;
  onSelect: (id: string) => void;
  viewMode?: 'grid' | 'list';
}
```

---

## 🟡 PHASE 3: i18n Completion (P2) - Trong 1-2 tháng

**Impact:** 🟡 MEDIUM - Quan trọng cho đa ngôn ngữ

### ✅ Task 3: Localize Literal Strings (672 warnings)

#### Week 1-2: Admin Module (Estimated: 8 hours)
- [ ] AdminDashboard - 50 strings
- [ ] AdminQuizManagement - 80 strings
- [ ] CategoryManagement - 30 strings
- [ ] UserManagement - 40 strings
- [ ] StatsDashboard - 60 strings

**Process:**
1. Identify all literal strings
2. Create translation keys
3. Add to `public/locales/vi/common.json`
4. Add to `public/locales/en/common.json`
5. Replace strings with `t()` calls

#### Week 3-4: Quiz Module (Estimated: 8 hours)
- [ ] QuizCreator - 100 strings
- [ ] QuizEditor - 80 strings
- [ ] QuizFilters - 20 strings
- [ ] QuizStats - 40 strings

#### Week 5-6: Multiplayer Module (Estimated: 4 hours)
- [ ] MultiplayerLobby - 50 strings
- [ ] GameRoom - 60 strings
- [ ] Leaderboard - 30 strings

#### Week 7-8: Shared & Others (Estimated: 4 hours)
- [ ] Error messages - 40 strings
- [ ] Success toasts - 30 strings
- [ ] Validation messages - 30 strings
- [ ] UI labels - 40 strings

---

## 🟢 PHASE 4: Cleanup (P3) - Khi rảnh

**Impact:** 🟢 LOW - Code quality

### ✅ Task 4: Remove Unused Variables (3 warnings)

- [ ] Find and remove unused imports
- [ ] Find and remove unused variables
- [ ] Clean up commented code

**Tools:**
```bash
# Auto-fix unused imports
npm run lint -- --fix
```

---

## 📊 Progress Tracking

### Week 1
```
[ ] Complete Phase 1 (P0 Critical)
    [ ] Fix all hook dependencies
    [ ] Test thoroughly
    [ ] Deploy to staging
```

### Week 2-3
```
[ ] Start Phase 2 (P1 High)
    [ ] Type API responses
    [ ] Type event handlers
    [ ] Progress: 0/293 any types fixed
```

### Week 4-5
```
[ ] Continue Phase 2
    [ ] Type component props
    [ ] Type utility functions
    [ ] Progress: 150/293 any types fixed
```

### Week 6-8
```
[ ] Start Phase 3 (P2 Medium)
    [ ] Localize admin module
    [ ] Localize quiz module
    [ ] Progress: 0/672 strings localized
```

---

## 🎯 Success Metrics

### Target Milestones

**After 1 Week:**
```
✅ P0 Critical: 0 warnings (100% fixed)
🔄 P1 High: 293 warnings (0% fixed)
⏸️ P2 Medium: 672 warnings (0% fixed)
```

**After 1 Month:**
```
✅ P0 Critical: 0 warnings
✅ P1 High: < 100 warnings (66% fixed)
🔄 P2 Medium: 672 warnings (0% fixed)
```

**After 3 Months:**
```
✅ P0 Critical: 0 warnings
✅ P1 High: < 50 warnings (83% fixed)
✅ P2 Medium: < 300 warnings (55% fixed)
```

---

## 🔧 Quick Reference Commands

### Run Lint
```bash
npm run lint
```

### Lint Specific File
```bash
npx eslint src/features/admin/pages/AdminDashboard.tsx
```

### Auto-Fix (cẩn thận!)
```bash
npm run lint -- --fix
```

### Count Warnings by Type
```powershell
npm run lint 2>&1 | Select-String -Pattern "@typescript-eslint/no-explicit-any" | Measure-Object
```

### Generate Report
```bash
npm run lint > lint-report.txt 2>&1
```

---

## 📝 Notes & Tips

### Hook Dependencies Best Practices
1. Always include ALL dependencies
2. Use `useCallback` for functions
3. Use `useMemo` for expensive calculations
4. Be careful with object/array dependencies
5. Test for infinite loops

### Type Safety Best Practices
1. Create interfaces for all data structures
2. Use generic types when appropriate
3. Avoid `as any` casting
4. Use type guards for runtime checks
5. Document complex types

### i18n Best Practices
1. Use namespace for organization
2. Keep keys descriptive
3. Support pluralization
4. Handle missing translations
5. Test both languages

---

## ⚠️ Important Reminders

1. **Test after each fix** - Don't batch too many changes
2. **Commit frequently** - Small, focused commits
3. **Review dependencies carefully** - Hook deps can break functionality
4. **Update translations** - Keep both vi and en in sync
5. **Monitor performance** - Some fixes may affect render performance

---

## 🎓 Resources

- [React Hooks Rules](https://react.dev/reference/react/hooks#rules-of-hooks)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [i18next Best Practices](https://react.i18next.com/latest/usetranslation-hook)

---

**Last Updated:** November 6, 2025  
**Next Review:** Weekly during Phase 1, Bi-weekly during Phase 2-3
