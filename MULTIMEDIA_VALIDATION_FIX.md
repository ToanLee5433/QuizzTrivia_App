# 🔧 Multimedia Question Validation Fix

## ❌ **Vấn đề:**

Khi tạo quiz với multimedia questions, nút "Tiếp tục" bị disabled và không thể ấn được.

### **Root Cause:**

Validation logic yêu cầu **TẤT CẢ answers phải có text**:
```typescript
// ❌ Validation cũ (SAI)
case 'multimedia':
  return !q.answers.some(a => a.isCorrect) || !q.answers.every(a => a.text);
```

Nhưng với multimedia questions, answer có thể:
- Chỉ có text (không media)
- Chỉ có media (không text) ← **Bị chặn bởi validation**
- Có cả text và media

## ✅ **Giải pháp:**

Updated validation để accept answer có **text HOẶC media**:

```typescript
// ✅ Validation mới (ĐÚNG)
case 'multimedia': // Answer must have text OR media
  if (!q.answers.some(a => a.isCorrect)) return true; // Must have correct answer
  // Each answer must have either text OR media (image/audio/video)
  return !q.answers.every(a => a.text || a.imageUrl || a.audioUrl || a.videoUrl);
```

## 📊 **Validation Rules:**

### **Standard Question Types (multiple, boolean, checkbox):**
```
✅ Must have correct answer
✅ All answers must have text
❌ Media không được accept (không có imageUrl/audioUrl/videoUrl fields)
```

### **Legacy Media Types (image, audio, video):**
```
✅ Must have correct answer
✅ All answers must have text
✅ Question có thể có media
❌ Answer media không được accept (legacy types)
```

### **Multimedia Type (NEW):**
```
✅ Must have correct answer
✅ Each answer must have: text OR media (or both)
✅ Question có thể có: text, image, audio, video
✅ Each answer có thể có: text, image, audio, video
```

## 🎯 **Valid Multimedia Question Examples:**

### **Example 1: Text + Media Mix**
```json
{
  "type": "multimedia",
  "text": "Which animal is this?",
  "imageUrl": "https://example.com/cat.jpg",
  "answers": [
    {
      "text": "Cat",
      "isCorrect": true
    },
    {
      "text": "Dog",
      "isCorrect": false
    }
  ]
}
```
✅ Valid - Answers có text

### **Example 2: Image Answers Only**
```json
{
  "type": "multimedia",
  "text": "Select the correct flag:",
  "answers": [
    {
      "text": "A",
      "imageUrl": "https://example.com/flag-vietnam.png",
      "isCorrect": true
    },
    {
      "text": "B", 
      "imageUrl": "https://example.com/flag-thailand.png",
      "isCorrect": false
    }
  ]
}
```
✅ Valid - Answers có cả text và image

### **Example 3: Audio Answers**
```json
{
  "type": "multimedia",
  "text": "Which sound is correct?",
  "answers": [
    {
      "audioUrl": "https://example.com/sound-a.mp3",
      "isCorrect": true
    },
    {
      "audioUrl": "https://example.com/sound-b.mp3",
      "isCorrect": false
    }
  ]
}
```
✅ Valid - Answers chỉ có audio (không cần text)

### **Example 4: Mixed Media Answers**
```json
{
  "type": "multimedia",
  "text": "Choose the correct answer:",
  "answers": [
    {
      "text": "This is text answer",
      "isCorrect": true
    },
    {
      "imageUrl": "https://example.com/image.jpg",
      "isCorrect": false
    },
    {
      "audioUrl": "https://example.com/audio.mp3",
      "isCorrect": false
    },
    {
      "videoUrl": "https://youtube.com/watch?v=123",
      "isCorrect": false
    }
  ]
}
```
✅ Valid - Mix của text, image, audio, video

### **Example 5: INVALID - Empty Answer**
```json
{
  "type": "multimedia",
  "text": "Question text",
  "answers": [
    {
      "text": "",
      "isCorrect": true
    }
  ]
}
```
❌ INVALID - Answer không có text hoặc media

## 🔍 **Validation Logic Flow:**

```
User clicks "Continue" button
         ↓
validateStep(step) called
         ↓
Check if questions step
         ↓
Loop through all questions
         ↓
For each multimedia question:
  1. ✅ Has correct answer?
  2. ✅ Each answer has (text OR imageUrl OR audioUrl OR videoUrl)?
         ↓
All valid? → Enable "Continue" button
Any invalid? → Disable "Continue" button (RED)
```

## 📁 **Files Modified:**

```
src/features/quiz/pages/CreateQuizPage/index.tsx
  Lines 231-234: Updated multimedia validation logic
```

### **Before (Line 228):**
```typescript
case 'multimedia':
  return !q.answers.some(a => a.isCorrect) || !q.answers.every(a => a.text);
```

### **After (Lines 231-234):**
```typescript
case 'multimedia': // Answer must have text OR media
  if (!q.answers.some(a => a.isCorrect)) return true;
  return !q.answers.every(a => a.text || a.imageUrl || a.audioUrl || a.videoUrl);
```

## 🧪 **Test Cases:**

### **Should PASS:**
- [ ] Answer with only text
- [ ] Answer with only image
- [ ] Answer with only audio
- [ ] Answer with only video (YouTube URL)
- [ ] Answer with text + image
- [ ] Answer with text + audio
- [ ] Answer with text + video
- [ ] Mix of different answer types in same question

### **Should FAIL:**
- [ ] Answer with empty text and no media
- [ ] No correct answer selected
- [ ] Question without question text
- [ ] Question with points < 1 or > 100

## ✅ **Summary:**

| Issue | Status | Solution |
|-------|--------|----------|
| **Cannot click Continue** | ✅ Fixed | Updated validation logic |
| **Text-only answers** | ✅ Working | Accepted by validation |
| **Media-only answers** | ✅ Fixed | Now accepted |
| **Mixed answers** | ✅ Working | Always supported |
| **Empty answers** | ✅ Blocked | Validation rejects |

## 🎉 **Kết quả:**

**Bây giờ có thể:**

1. ✅ Tạo multimedia question với answers chỉ có media (không text)
2. ✅ Tạo multimedia question với answers chỉ có text (không media)
3. ✅ Tạo multimedia question với mix của text và media
4. ✅ Button "Tiếp tục" enable khi validation pass
5. ✅ Không bị chặn bởi validation sai

**Hoàn toàn linh hoạt và đúng logic!** 🚀
