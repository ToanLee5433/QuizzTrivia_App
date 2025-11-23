# 🎭 Multimedia Question - Design Document

## Concept
Gộp 3 loại câu hỏi (image, audio, video) thành 1 loại duy nhất có khả năng mix & match linh hoạt.

## UI Design

### Question Section
```
┌─────────────────────────────────────────┐
│ 🎭 Multimedia Question                   │
├─────────────────────────────────────────┤
│                                           │
│ Question Text: [___________________]      │
│                                           │
│ Question Media (Optional):                │
│ ┌───────────────────────────────────┐   │
│ │ Type: ○ None  ○ Image  ○ Audio    │   │
│ │       ○ Video                      │   │
│ ├───────────────────────────────────┤   │
│ │ [Upload Component based on type]   │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Answers Section
```
┌─────────────────────────────────────────┐
│ Answers                     [+ Add]      │
├─────────────────────────────────────────┤
│ A │ Text: [____________]                 │
│   │ Media: ○ None ○ Image ○ Audio ○ Video│
│   │ [Upload Component]                   │
│   │ [ ✓ Correct Answer ]      [Delete]   │
├─────────────────────────────────────────┤
│ B │ ...                                   │
└─────────────────────────────────────────┘
```

## Data Structure
```typescript
{
  type: "multimedia",
  text: "Question text",
  // Question media (only one active)
  imageUrl: "https://..." | "",
  audioUrl: "https://..." | "",
  videoUrl: "https://..." | "",
  
  answers: [
    {
      id: "a1",
      text: "Answer text",
      // Answer media (only one active per answer)
      imageUrl: "https://..." | "",
      audioUrl: "https://..." | "",
      videoUrl: "https://..." | "",
      isCorrect: true
    }
  ]
}
```

## Use Cases

### 1. Video Question + Image Answers
```
Question: 🎬 Video (cooking tutorial)
Answers:  🖼️ Image A (final dish photo)
          🖼️ Image B (wrong dish)
```

### 2. Audio Question + Text Answers  
```
Question: 🎵 Audio (song clip)
Answers:  📝 "Song A"
          📝 "Song B"
```

### 3. Image Question + Video Answers
```
Question: 🖼️ Image (broken code screenshot)
Answers:  🎬 Video A (fix explanation)
          🎬 Video B (wrong approach)
```

### 4. Mixed Everything
```
Question: 📝 Text + 🎬 Video
Answers:  🖼️ Image A
          🎵 Audio B
          📝 Text C
          🎬 Video D
```

## Implementation Steps
1. ✅ Add 'multimedia' type to types.ts
2. ✅ Update QuestionEditor initialization
3. ✅ Update handleAddAnswer
4. ⏳ Create multimedia UI component
5. ⏳ Update QuestionRenderer
6. ⏳ Update locale files
7. ⏳ Testing

## Benefits
- 🎯 Flexibility: Mix any media types
- 🚀 Simplicity: One type instead of three
- 💪 Power: More creative quiz questions
- 🔄 Backward compatible: Keep old types working
