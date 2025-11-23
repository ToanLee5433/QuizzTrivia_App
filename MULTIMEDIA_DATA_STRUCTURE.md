# Multimedia Question Data Structure & Firestore Validation

## ✅ Current Implementation Status

### 1. **Question Type Definition** (`types.ts`)
```typescript
export type QuestionType =
  | 'multiple'
  | 'boolean'
  | 'short_answer'
  | 'checkbox'
  | 'multimedia'    // ✅ Đã thêm
  | 'image'         // [Deprecated]
  | 'audio'         // [Deprecated]
  | 'video'         // [Deprecated]
  | 'ordering'
  | 'matching'
  | 'fill_blanks'
  | 'rich_content';
```

### 2. **Question Interface** (`types.ts`)
```typescript
export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  answers: Answer[];
  points?: number;
  explanation?: string;
  
  // Media fields (cho multimedia type)
  imageUrl?: string;    // ✅ Optional
  audioUrl?: string;    // ✅ Optional
  videoUrl?: string;    // ✅ Optional
  
  // ... other fields
}
```

### 3. **Answer Interface** (`types.ts`)
```typescript
export interface Answer {
  id: string;
  text: string;
  isCorrect?: boolean;
  
  // Media fields (cho multimedia answers)
  imageUrl?: string;    // ✅ Optional
  audioUrl?: string;    // ✅ Optional
  videoUrl?: string;    // ✅ Optional
  
  // ... other fields
}
```

## 📊 Multimedia Question Data Flow

### **Creation (QuestionEditor.tsx)**

**Initialization:**
```typescript
case 'multimedia':
  newAnswers = Array.from({ length: 4 }, (_, i) => ({
    id: generateId(),
    text: '',
    isCorrect: i === 0,
  }));
  // ✅ Initialize với undefined (không hiển thị uploader)
  newQuestion.imageUrl = undefined;
  newQuestion.audioUrl = undefined;
  newQuestion.videoUrl = undefined;
  break;
```

**Radio Button Selection:**
```typescript
// Text: Tất cả = undefined
checked={question.imageUrl === undefined && question.audioUrl === undefined && question.videoUrl === undefined}
onChange={() => onChange({ ...question, imageUrl: undefined, audioUrl: undefined, videoUrl: undefined })}

// Image: imageUrl = '', others = undefined
checked={question.imageUrl !== undefined && question.imageUrl !== null}
onChange={() => onChange({ ...question, imageUrl: '', audioUrl: undefined, videoUrl: undefined })}

// Audio: audioUrl = '', others = undefined
checked={question.audioUrl !== undefined && question.audioUrl !== null}
onChange={() => onChange({ ...question, imageUrl: undefined, audioUrl: '', videoUrl: undefined })}

// Video: videoUrl = '', others = undefined
checked={question.videoUrl !== undefined && question.videoUrl !== null}
onChange={() => onChange({ ...question, imageUrl: undefined, audioUrl: undefined, videoUrl: '' })}
```

### **Validation (index.tsx)**

```typescript
case 'multimedia': // ✅ Đã thêm validation
  return !q.answers.some(a => a.isCorrect) || !q.answers.every(a => a.text);
```

**Validation Rules:**
- ✅ Phải có ít nhất 1 đáp án đúng
- ✅ Tất cả đáp án phải có text
- ⚠️ Media URLs không bắt buộc (optional)

### **Firestore Save (index.tsx)**

**⚠️ ISSUE FOUND - Inconsistent media field handling:**

**Current Code:**
```typescript
questions: (quiz.questions || []).map(q => ({
  // ... other fields
  
  // ❌ imageUrl LUÔN được save (|| null)
  imageUrl: q.imageUrl || null,
  
  // ✅ audioUrl CHỈ save khi exists
  ...(q.audioUrl && { audioUrl: q.audioUrl }),
  
  // ✅ videoUrl CHỈ save khi exists
  ...(q.videoUrl && { videoUrl: q.videoUrl }),
}))
```

**Answer Media (Correct):**
```typescript
answers: (q.answers || []).map(a => ({
  // ✅ Tất cả media fields đều dùng conditional spread
  ...(a.imageUrl && { imageUrl: a.imageUrl }),
  ...(a.audioUrl && { audioUrl: a.audioUrl }),
  ...(a.videoUrl && { videoUrl: a.videoUrl }),
}))
```

## 🔧 Required Fixes

### **Fix 1: Consistent Question Media Field Handling**

**Change from:**
```typescript
imageUrl: q.imageUrl || null,
...(q.audioUrl && { audioUrl: q.audioUrl }),
...(q.videoUrl && { videoUrl: q.videoUrl }),
```

**Change to:**
```typescript
...(q.imageUrl && { imageUrl: q.imageUrl }),
...(q.audioUrl && { audioUrl: q.audioUrl }),
...(q.videoUrl && { videoUrl: q.videoUrl }),
```

**Impact:**
- Chỉ save media fields khi chúng có giá trị
- Giảm kích thước Firestore document
- Consistent với answer media handling

### **Fix 2: Apply to Both Functions**

**Locations to fix:**
1. `handleSubmit` (line ~331) - Publish function
2. `saveDraft` (line ~490) - Draft save function

## 📋 Firestore Document Structure

### **Multimedia Question Example:**

**Text Only (no media):**
```json
{
  "id": "q1",
  "text": "What is React?",
  "type": "multimedia",
  "points": 10,
  "answers": [
    {
      "id": "a1",
      "text": "A JavaScript library",
      "isCorrect": true
    },
    {
      "id": "a2",
      "text": "A database",
      "isCorrect": false
    }
  ]
  // ✅ Không có imageUrl, audioUrl, videoUrl fields
}
```

**Question with Image:**
```json
{
  "id": "q2",
  "text": "What animal is this?",
  "type": "multimedia",
  "imageUrl": "https://example.com/cat.jpg",  // ✅ Có imageUrl
  "points": 10,
  "answers": [
    {
      "id": "a1",
      "text": "Cat",
      "isCorrect": true
    },
    {
      "id": "a2",
      "text": "Dog",
      "isCorrect": false
    }
  ]
  // ✅ Không có audioUrl, videoUrl
}
```

**Answer with Media:**
```json
{
  "id": "q3",
  "text": "Which sound is correct?",
  "type": "multimedia",
  "points": 10,
  "answers": [
    {
      "id": "a1",
      "text": "Sound A",
      "audioUrl": "https://example.com/sound-a.mp3",  // ✅ Answer có audioUrl
      "isCorrect": true
    },
    {
      "id": "a2",
      "text": "Sound B",
      "audioUrl": "https://example.com/sound-b.mp3",
      "isCorrect": false
    }
  ]
}
```

## 🧪 Testing Checklist

### **Create & Save:**
- [ ] Create multimedia question with Text only → Firestore không có media fields
- [ ] Create multimedia question with Image → Firestore có imageUrl field
- [ ] Create multimedia question with Audio → Firestore có audioUrl field
- [ ] Create multimedia question with Video → Firestore có videoUrl field

### **Mixed Media:**
- [ ] Question: Image + Answer: Audio → Cả 2 fields đều được save
- [ ] Question: Video + Answer: Image → Cả 2 fields đều được save
- [ ] Question: Text + Answer: Text → Không có media fields

### **Validation:**
- [ ] Cannot publish without correct answer
- [ ] Cannot publish with empty answer text
- [ ] Can publish with/without media URLs (optional)

### **Rendering:**
- [ ] Load quiz from Firestore → QuestionRenderer displays correctly
- [ ] Text only question → No uploader shown
- [ ] Image question → Image displayed
- [ ] Audio question → Audio player displayed
- [ ] Video question → Video player displayed

## ⚠️ Known Issues & Next Steps

1. **Line 331 & 490:** Change `imageUrl: q.imageUrl || null` to conditional spread
2. **Add console logging:** Already added media field logging for debugging
3. **Test in Firestore:** Verify media fields are saved correctly

## 🎯 Success Criteria

- ✅ Multimedia question type validates correctly
- ✅ Media fields only saved when they exist (no null fields)
- ✅ Answer media fields saved correctly (already working)
- ✅ Question media fields saved consistently
- ✅ Firestore documents are clean and minimal
- ✅ Quiz loads and renders correctly from Firestore
