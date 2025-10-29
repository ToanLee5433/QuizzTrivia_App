# 🚀 Hướng Dẫn Sử Dụng Aggressive i18n Replacer

## ⚡ Quick Start

### Bước 1: Xem trước thay đổi (DRY RUN)
```bash
npm run i18n:aggressive-dry
```

Hoặc với chi tiết hơn:
```bash
node scripts/aggressive-i18n-replacer.mjs --dry-run --verbose
```

### Bước 2: Backup và Thực hiện (LIVE)
```bash
# Cách 1: An toàn với backup tự động
npm run i18n:aggressive

# Cách 2: Thực hiện trực tiếp (không khuyến nghị)
node scripts/aggressive-i18n-replacer.mjs
```

### Bước 3: Hoàn chỉnh toàn bộ
```bash
# Chạy tất cả: complete translations + replace strings
npm run i18n:full
```

## 🎯 Script Này Làm Gì?

### 1. Tìm và Thay Thế TOÀN BỘ
Script này **THỰC SỰ THAY ĐỔI CODE** của bạn:

**Trước:**
```tsx
<button>Đăng nhập</button>
const message = "Xin chào";
alert('Đã lưu thành công');
```

**Sau:**
```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  
  return (
    <>
      <button>{t('dangNhap')}</button>
      {/* const message = t('xinChao'); */}
      {/* alert(t('daLuuThanhCong')); */}
    </>
  );
}
```

### 2. Tự Động Thêm Import & Hook
- ✅ Thêm `import { useTranslation } from 'react-i18next'`
- ✅ Thêm `const { t } = useTranslation()`
- ✅ Đặt đúng vị trí trong component

### 3. Xử Lý Nhiều Pattern
- ✅ JSX text: `<div>Text</div>`
- ✅ Double quotes: `"Text"`
- ✅ Single quotes: `'Text'`
- ✅ Template literals: `` `Text` ``

## 📊 Output Mẫu

```
🚀 AGGRESSIVE i18n String Replacer
================================================================================
⚠️  DRY RUN MODE - Previewing changes only

📖 Loading translations...
✓ Loaded 1689 translation mappings

🔍 Processing files...

✓ src/components/Button.tsx
  3 replacements
    - JSX text: "Đăng nhập" → t('dangNhap')
    - Single quote: "Lưu" → t('luu')
    - Double quote: "Hủy" → t('huy')

✓ src/pages/Login.tsx
  12 replacements
    ...

================================================================================
📊 Replacement Summary:
================================================================================
  Files processed:     156
  Files modified:      89
  Files skipped:       67
  Total replacements:  847
  Errors:              0
  Available keys:      1689

⚠️  DRY RUN MODE - No files were actually modified
Remove --dry-run flag to apply changes
```

## ⚠️ Lưu Ý Quan Trọng

### 1. LUÔN Backup Trước
```bash
# Option 1: Git commit
git add .
git commit -m "Before aggressive i18n replacement"

# Option 2: Sử dụng safe script (tự động backup)
npm run i18n:aggressive
```

### 2. Review Dry Run Kỹ
- Kiểm tra số lượng replacements
- Xem các file sẽ bị thay đổi
- Đảm bảo không có false positives

### 3. Test Sau Khi Replace
```bash
# Test dev server
npm run dev

# Test build
npm run build

# Test features
# - Chuyển ngôn ngữ
# - Kiểm tra tất cả các trang
# - Kiểm tra form validation
```

## 🔧 Troubleshooting

### Vấn đề 1: Import bị duplicate

**Nguyên nhân:** File đã có import react-i18next

**Giải pháp:**
```bash
# Tìm và sửa manually
grep -r "import.*useTranslation" src/
```

### Vấn đề 2: Hook được thêm sai chỗ

**Nguyên nhân:** Component structure phức tạp

**Giải pháp:**
- Review file đó
- Di chuyển hook vào đúng vị trí
- Commit fix

### Vấn đề 3: Một số strings không được replace

**Nguyên nhân:**
- String quá ngắn (< 3 ký tự)
- String trong comment
- String trong URL/path
- String có biến template

**Giải pháp:**
- Thêm vào translation manually
- Sử dụng t() manually

### Vấn đề 4: Build bị lỗi

**Nguyên nhân:** Syntax error sau replace

**Giải pháp:**
```bash
# Restore về trước
git restore .

# Hoặc sửa từng file lỗi
npm run build 2>&1 | grep "error"
```

## 💡 Tips & Tricks

### Tip 1: Test từng folder
```javascript
// Sửa trong aggressive-i18n-replacer.mjs
const config = {
  sourceDir: path.join(__dirname, '../src/features/auth'),  // Chỉ auth folder
  // ...
};
```

### Tip 2: Exclude files cụ thể
```javascript
const config = {
  excludeFiles: [
    'i18n/index.ts',
    'firebase/config.ts',
    'MyComponent.tsx',  // Thêm file cần exclude
  ],
  // ...
};
```

### Tip 3: Verbose mode để debug
```bash
node scripts/aggressive-i18n-replacer.mjs --dry-run --verbose
```

### Tip 4: Xử lý từng bước
```bash
# 1. Complete translations trước
npm run i18n:complete

# 2. Dry run kiểm tra
npm run i18n:aggressive-dry

# 3. Nếu OK, thực hiện
npm run i18n:aggressive

# 4. Test
npm run dev
```

## 📈 Kết Quả Mong Đợi

### Sau khi chạy thành công:

#### Metrics
- ✅ 80-90% chuỗi hard-coded được thay thế
- ✅ Tất cả components có useTranslation hook
- ✅ Build thành công không lỗi
- ✅ Chuyển ngôn ngữ hoạt động mượt mà

#### Code Quality
- ✅ Consistent i18n usage
- ✅ No hardcoded Vietnamese strings
- ✅ Proper imports and hooks
- ✅ Clean and maintainable

## 🎓 Best Practices

### 1. Incremental Replacement
Không replace toàn bộ 1 lần, chia nhỏ:
```bash
# Features folder by folder
cd src/features/auth && node ../../scripts/aggressive-i18n-replacer.mjs
cd src/features/quiz && node ../../scripts/aggressive-i18n-replacer.mjs
# ...
```

### 2. Test After Each Feature
```bash
npm run dev
# Test feature vừa replace
# Nếu OK, commit
git add .
git commit -m "feat(i18n): Replace strings in auth feature"
```

### 3. Review PR Carefully
- Check diff của từng file
- Đảm bảo logic không thay đổi
- Test all edge cases

## 🆘 Recovery

### Nếu có vấn đề:

#### Option 1: Git Restore
```bash
# Restore tất cả
git restore .

# Hoặc restore 1 file
git restore src/path/to/file.tsx
```

#### Option 2: Git Reset
```bash
# Reset về commit trước
git reset --hard HEAD~1
```

#### Option 3: Từ Backup
```bash
# Tìm backup
ls .i18n-backup/

# Xem nội dung
cat .i18n-backup/backup-*.txt
```

## ✅ Checklist

Trước khi chạy:
- [ ] Đã commit code
- [ ] Đã chạy dry-run
- [ ] Đã review output
- [ ] Có backup plan

Sau khi chạy:
- [ ] Build thành công
- [ ] Dev server chạy OK
- [ ] Chuyển ngôn ngữ hoạt động
- [ ] Tất cả features OK
- [ ] Đã commit changes

---

**🎉 Chúc bạn thành công!**

**Cần trợ giúp?** Đọc lại guide hoặc xem logs chi tiết trong `aggressive-replacement-report.json`
