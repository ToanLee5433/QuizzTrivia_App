# 🎬 MASTER PLAN: TÍNH NĂNG CẮT VIDEO/AUDIO (NON-DESTRUCTIVE)

> **Mục tiêu**: Cho phép Creator chọn đoạn bắt đầu/kết thúc cho media trong câu hỏi quiz (giống Kahoot)
> 
> **Chiến thuật**: "Cắt ảo" (Non-destructive) - File gốc giữ nguyên, chỉ lưu metadata (`startTime`, `endTime`) và xử lý phát lại ở Client

---

## 📋 TỔNG QUAN

### Tính năng cần làm
| # | Tính năng | Mô tả | Độ ưu tiên | Quyết định |
|---|-----------|-------|------------|------------|
| 1 | Start/End Time Selection | Chọn điểm bắt đầu và kết thúc | 🔴 Critical | ✅ Làm |
| 2 | Preview Playback | Xem trước đoạn đã chọn | 🔴 Critical | ✅ Làm |
| 3 | Visual Timeline (Radix UI) | Thanh slider kéo thả 2 đầu | 🔴 Critical | ✅ Làm |
| 4 | Time Input Fields | Nhập thời gian thủ công (mm:ss) | 🟡 Important | ✅ Làm |
| 5 | Audio Waveform | Hiển thị sóng âm thanh | 🟢 Nice-to-have | ❌ **KHÔNG LÀM** |
| 6 | Video Thumbnails | Preview frames trên timeline | 🟢 Nice-to-have | ❌ **KHÔNG LÀM** |

### Phạm vi hỗ trợ
- ✅ YouTube videos (via `react-youtube` API, **KHÔNG dùng ?end= URL**)
- ✅ Direct video files (mp4, webm, etc.)
- ✅ Audio files (mp3, wav, etc.)
- ❌ Không cắt file thực sự (chỉ lưu metadata)
- ❌ **KHÔNG** hỗ trợ Learning Resources (chỉ Question Media)

### Quyết định quan trọng đã xác nhận
| Câu hỏi | Quyết định | Lý do |
|---------|------------|-------|
| **Scope** | Chỉ Question Media | Tập trung nỗi đau lớn nhất (video dài trong câu hỏi 30s) |
| **Waveform** | ❌ Không làm | Nặng 150KB, lag UI, mobile phức tạp |
| **Mobile** | ✅ Bắt buộc tối ưu | Creator dùng iPad/phone nhiều |
| **Duration limit** | Max 10-15 phút input | Tránh crash RAM, UI slider không cắt được |
| **Default behavior** | Phát toàn bộ (Opt-in) | Tiện lợi, không rác DB |

---

## 📦 DEPENDENCIES (CÀI ĐẶT NGAY)

```bash
npm install @radix-ui/react-slider react-youtube clsx tailwind-merge
```

| Package | Mục đích | Size |
|---------|----------|------|
| `@radix-ui/react-slider` | Slider 2 handles, hỗ trợ touch mobile | ~10KB |
| `react-youtube` | Control YouTube API (play, pause, seekTo) | ~5KB |
| `clsx` + `tailwind-merge` | CSS class động | ~3KB |

> ⚠️ **KHÔNG cài wavesurfer.js** - Đã quyết định không làm waveform

---

## 🏗️ KIẾN TRÚC GIẢI PHÁP

### Schema Changes (Đã finalize)

```typescript
// src/features/quiz/types.ts

export interface MediaTrimSettings {
  startTime: number;      // Giây (VD: 10)
  endTime: number;        // Giây (VD: 120)
  duration: number;       // Tổng độ dài đoạn cắt (endTime - startTime)
  isTrimmed: boolean;     // Cờ đánh dấu có cắt hay không (quan trọng!)
}

export interface Question {
  // ... các trường cũ
  
  // 🆕 Settings cắt media (dùng chung cho Video và Audio)
  mediaTrim?: MediaTrimSettings; 
}
```

> **Lưu ý**: Dùng 1 object `mediaTrim` chung thay vì `videoTrim` + `audioTrim` riêng để đơn giản hóa

### Component Architecture (Đã cập nhật)

```
src/
├── features/quiz/components/
│   ├── MediaTrimmer/
│   │   ├── index.tsx                 # Main export
│   │   ├── MediaTrimmerModal.tsx     # Container Modal (Full screen mobile)
│   │   ├── TrimSlider.tsx            # Radix UI dual-handle slider
│   │   ├── TrimPreview.tsx           # Video/Audio preview với trim logic
│   │   ├── TimeInputs.tsx            # Start/End time inputs (mm:ss)
│   │   └── hooks/
│   │       ├── useMediaDuration.ts   # Lấy duration của media
│   │       ├── useTrimmedControl.ts  # 🔥 Core: xử lý pause tại endTime
│   │       └── useYouTubeTrim.ts     # Xử lý riêng cho YouTube API
│   │
│   └── MediaUploader.tsx             # Thêm nút "Cắt video (Tùy chọn)"
│
├── shared/components/ui/
│   ├── VideoPlayer.tsx               # Cập nhật props: startTime?, endTime?
│   └── AudioPlayer.tsx               # Cập nhật props: startTime?, endTime?
```

---

## 📅 LỘ TRÌNH TRIỂN KHAI CHI TIẾT

### 🔵 GIAI ĐOẠN 1: XÂY DỰNG UI TRIMMER (4 giờ)
> **Mục tiêu**: Hoàn thành giao diện thanh kéo - phần khó nhất về UI

#### Task 1.1: Cài đặt Dependencies
```bash
npm install @radix-ui/react-slider react-youtube clsx tailwind-merge
```
- [ ] Verify packages installed
- [ ] Test import trong component

#### Task 1.2: Tạo `TrimSlider.tsx` với Radix UI
- [ ] Dual-handle slider (Start/End)
- [ ] `minStepsBetweenThumbs={3}` - tối thiểu cách nhau 3s
- [ ] Hiển thị mm:ss trên đầu mỗi handle
- [ ] Mobile touch target: `w-6 h-6` (24px)
- [ ] `onValueChange` - update UI liên tục khi kéo
- [ ] `onValueCommit` - chỉ tua video khi thả tay (tránh lag)

#### Task 1.3: Tạo `MediaTrimmerModal.tsx`
- [ ] Modal container với Video Player + TrimSlider
- [ ] **Mobile**: Full screen thay vì popup nhỏ
- [ ] Buttons: Cancel / Save Trim
- [ ] Loading state khi đang lấy duration

#### Task 1.4: Tạo `TimeInputs.tsx`
- [ ] Input fields cho mm:ss format
- [ ] Validation: end > start, không vượt duration
- [ ] Sync 2 chiều với slider

---

### 🔵 GIAI ĐOẠN 2: XỬ LÝ LOGIC PHÁT (3 giờ)
> **Mục tiêu**: Xây dựng "trái tim" - engine xử lý trim playback

#### Task 2.1: Hook `useTrimmedControl.ts` (HTML5 Video/Audio)
```typescript
// Logic cốt lõi:
// 1. loadedmetadata -> seekTo(startTime)
// 2. timeupdate -> if (currentTime >= endTime) { pause(); seekTo(startTime) }
```
- [ ] Input: `mediaRef`, `trimSettings`
- [ ] Chỉ kích hoạt khi `isTrimmed === true`
- [ ] Auto-reset về startTime khi chạm endTime

#### Task 2.2: Hook `useYouTubeTrim.ts` (YouTube API)
```typescript
// ⚠️ KHÔNG dùng ?end=... trên URL (hay hiện quảng cáo)
// Dùng setInterval + player.getCurrentTime() để kiểm tra
```
- [ ] Dùng `react-youtube` player instance
- [ ] `setInterval` hoặc `requestAnimationFrame` để polling
- [ ] `player.seekTo(startTime)` khi cần reset

#### Task 2.3: Hook `useMediaDuration.ts`
- [ ] Lấy duration từ HTML5 `<video>` / `<audio>`
- [ ] Lấy duration từ YouTube via API `player.getDuration()`
- [ ] Handle loading/error states

---

### 🔵 GIAI ĐOẠN 3: TÍCH HỢP VÀO QUIZ EDITOR (4 giờ)
> **Mục tiêu**: Creator có thể cắt video/audio ngay trong QuestionEditor

#### Task 3.1: Cập nhật `MediaUploader.tsx`
- [ ] Thêm nút "✂️ Cắt video (Tùy chọn)" - chỉ hiện khi type = video/audio
- [ ] Bấm nút -> Mở `MediaTrimmerModal`
- [ ] Validation: Nếu file > 15 phút hoặc > 100MB -> Cảnh báo

#### Task 3.2: Tích hợp `MediaTrimmerModal`
- [ ] Load video/audio vào player
- [ ] User kéo slider -> Video tự tua đến điểm đó (preview)
- [ ] Bấm "Lưu" -> Ghi `MediaTrimSettings` vào Question

#### Task 3.3: Hiển thị kết quả trim
- [ ] Dưới file upload hiển thị: "✂️ Đã cắt: 00:30 - 02:15 (1:45)"
- [ ] Nút "Chỉnh sửa" để mở lại Modal
- [ ] Nút "Xóa cắt" để reset về full duration

#### Task 3.4: Cập nhật Question Schema
- [ ] Thêm `MediaTrimSettings` interface vào `types.ts`
- [ ] Thêm `mediaTrim?` field vào `Question`
- [ ] Cập nhật Firebase `dataModels.ts` nếu cần

---

### 🔵 GIAI ĐOẠN 4: TÍCH HỢP VÀO MÀN HÌNH CHƠI (3 giờ)
> **Mục tiêu**: Player phát đúng đoạn đã cắt khi chơi quiz

#### Task 4.1: Cập nhật `VideoPlayer.tsx`
```tsx
interface VideoPlayerProps {
  url: string;
  trimSettings?: MediaTrimSettings;  // 🆕
  // ... existing props
}
```
- [ ] Nếu `trimSettings?.isTrimmed`: sử dụng `useTrimmedControl`
- [ ] YouTube: dùng `useYouTubeTrim` thay vì URL params
- [ ] HTML5: dùng `useTrimmedControl`

#### Task 4.2: Cập nhật `AudioPlayer.tsx`
- [ ] Tương tự VideoPlayer
- [ ] Props: `trimSettings?: MediaTrimSettings`

#### Task 4.3: Cập nhật `QuestionRenderer.tsx`
- [ ] Đọc `question.mediaTrim`
- [ ] Pass `trimSettings` cho VideoPlayer/AudioPlayer
- [ ] Handle autoplay từ `startTime`

#### Task 4.4: Xử lý Offline
- [ ] File tải lên (Blob): Chạy bình thường từ IndexedDB
- [ ] YouTube + Offline: Hiện thông báo "Video YouTube không khả dụng khi ngoại tuyến"

---

### 🔵 GIAI ĐOẠN 5: TESTING & I18N (3 giờ)

#### Task 5.1: Testing Edge Cases
- [ ] Test YouTube videos (short, long)
- [ ] Test uploaded video files (mp4, webm)
- [ ] Test audio files (mp3, wav)
- [ ] Test với `isTrimmed = false` (phát toàn bộ)
- [ ] Test với `isTrimmed = true` (phát đoạn cắt)
- [ ] Test mobile touch/drag
- [ ] Test offline mode

#### Task 5.2: i18n
- [ ] Thêm translation keys cho EN/VI
- [ ] Labels: "Cắt video", "Bắt đầu", "Kết thúc", "Xem trước", "Lưu", etc.

#### Task 5.3: Build & Deploy
- [ ] `npm run build` - verify no errors
- [ ] Deploy staging
- [ ] Production release

---

## 🎨 UI/UX DESIGN

### MediaTrimmerModal Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  ✂️ Cắt Video                                          [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              VIDEO PREVIEW PLAYER                   │   │
│  │                   (16:9 ratio)                      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [●]═════════════════════════════════════════════[●] │   │
│  │  ↑ Start handle              Timeline    End handle ↑   │
│  │      (24px touch target)                 (24px)         │
│  └─────────────────────────────────────────────────────┘   │
│   0:00                                             3:45     │
│                                                             │
│  ┌──────────────┐    →    ┌──────────────┐                 │
│  │ Bắt đầu:0:30 │         │ Kết thúc:2:15│  Độ dài: 1:45   │
│  └──────────────┘         └──────────────┘                 │
│                                                             │
│  [▶ Xem trước đoạn cắt]                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Hủy]  [💾 Lưu]               │
└─────────────────────────────────────────────────────────────┘
```

### MediaTrimmerModal Layout (Mobile - FULL SCREEN)

```
┌─────────────────────────────┐
│  ✂️ Cắt Video          [X]  │
├─────────────────────────────┤
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │   VIDEO PREVIEW       │  │
│  │     (Full width)      │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  [●]═══════════════════[●]  │
│   ↑ 24px              24px ↑│
│                             │
│  Bắt đầu: [  0:30  ]       │
│  Kết thúc: [ 2:15  ]       │
│  Độ dài:    1:45           │
│                             │
│  [▶ Xem trước]              │
│                             │
│  ┌───────────────────────┐  │
│  │   [Hủy]    [💾 Lưu]   │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### QuestionEditor - Hiển thị Trim Info

```
┌─────────────────────────────────────────────────────────────┐
│ 📹 Video đính kèm                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐                                           │
│  │  Thumbnail  │  video_file.mp4                           │
│  │   Preview   │  ✂️ Đã cắt: 0:30 - 2:15 (1:45)            │
│  └─────────────┘  [Chỉnh sửa] [Xóa cắt] [Xóa file]         │
└─────────────────────────────────────────────────────────────┘

// Nếu chưa cắt:
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────┐                                           │
│  │  Thumbnail  │  video_file.mp4 (3:45)                    │
│  │   Preview   │  [✂️ Cắt video (Tùy chọn)] [Xóa file]     │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 CODE MẪU QUAN TRỌNG (Copy để dùng ngay)

### A. Component `TrimSlider.tsx` (Radix UI + Tailwind)

```tsx
import React from 'react';
import * as Slider from '@radix-ui/react-slider';

// Hàm format giây thành 00:00
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface TrimSliderProps {
  duration: number;
  startTime: number;
  endTime: number;
  // onValueChange: Gọi liên tục khi kéo (để update số giây trên UI)
  onValueChange: (val: [number, number]) => void; 
  // onValueCommit: Chỉ gọi khi thả tay ra (để tua video - tránh lag)
  onValueCommit: (val: [number, number]) => void; 
}

export const TrimSlider: React.FC<TrimSliderProps> = ({
  duration, startTime, endTime, onValueChange, onValueCommit
}) => {
  return (
    <div className="w-full px-2 py-6">
      <div className="flex justify-between mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">
        <span>Bắt đầu: {formatTime(startTime)}</span>
        <span>Kết thúc: {formatTime(endTime)}</span>
      </div>

      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
        value={[startTime, endTime]}
        max={duration}
        step={1}
        minStepsBetweenThumbs={3} // ⚡ Bắt buộc đoạn cắt > 3 giây
        onValueChange={(val) => onValueChange(val as [number, number])}
        onValueCommit={(val) => onValueCommit(val as [number, number])}
      >
        <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
          <Slider.Range className="absolute bg-blue-500 h-full rounded-full" />
        </Slider.Track>
        
        {/* Nút Start - 24px touch target */}
        <Slider.Thumb 
          className="block w-6 h-6 bg-white border-2 border-blue-500 shadow-lg rounded-full 
                     hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400
                     transition-colors cursor-grab active:cursor-grabbing" 
          aria-label="Start time"
        />
        
        {/* Nút End - 24px touch target */}
        <Slider.Thumb 
          className="block w-6 h-6 bg-white border-2 border-blue-500 shadow-lg rounded-full 
                     hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400
                     transition-colors cursor-grab active:cursor-grabbing" 
          aria-label="End time"
        />
      </Slider.Root>
      
      {/* Duration labels */}
      <div className="flex justify-between mt-1 text-xs text-gray-400">
        <span>0:00</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};
```

### B. Hook `useTrimmedControl.ts` (HTML5 Video/Audio)

```typescript
import { useEffect, useCallback, RefObject } from 'react';
import { MediaTrimSettings } from '../types';

export const useTrimmedControl = (
  mediaRef: RefObject<HTMLMediaElement>,
  trimSettings?: MediaTrimSettings
) => {
  const seekToStart = useCallback(() => {
    const media = mediaRef.current;
    if (media && trimSettings?.isTrimmed) {
      media.currentTime = trimSettings.startTime;
    }
  }, [mediaRef, trimSettings]);

  useEffect(() => {
    const media = mediaRef.current;
    
    // ⚡ Chỉ kích hoạt khi isTrimmed = true
    if (!media || !trimSettings?.isTrimmed) return;

    const { startTime, endTime } = trimSettings;

    // 1. Tua đến điểm bắt đầu khi mới load
    const onLoaded = () => {
      if (media.currentTime < startTime) {
        media.currentTime = startTime;
      }
    };

    // 2. Kiểm tra liên tục để dừng tại endTime
    const onTimeUpdate = () => {
      if (media.currentTime >= endTime) {
        media.pause();
        media.currentTime = startTime; // Reset về đầu
      }
    };

    // 3. Khi play lại, đảm bảo bắt đầu từ startTime
    const onPlay = () => {
      if (media.currentTime < startTime || media.currentTime >= endTime) {
        media.currentTime = startTime;
      }
    };

    media.addEventListener('loadedmetadata', onLoaded);
    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('play', onPlay);

    return () => {
      media.removeEventListener('loadedmetadata', onLoaded);
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('play', onPlay);
    };
  }, [mediaRef, trimSettings]);

  return { seekToStart };
};
```

### C. Hook `useYouTubeTrim.ts` (YouTube API via react-youtube)

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { MediaTrimSettings } from '../types';

interface YouTubePlayer {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  pauseVideo: () => void;
  playVideo: () => void;
}

export const useYouTubeTrim = (
  playerRef: React.MutableRefObject<YouTubePlayer | null>,
  trimSettings?: MediaTrimSettings,
  isPlaying?: boolean
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAndEnforce = useCallback(() => {
    const player = playerRef.current;
    if (!player || !trimSettings?.isTrimmed) return;

    const currentTime = player.getCurrentTime();
    const { startTime, endTime } = trimSettings;

    // Nếu vượt quá endTime -> pause và reset
    if (currentTime >= endTime) {
      player.pauseVideo();
      player.seekTo(startTime, true);
    }
    
    // Nếu lùi về trước startTime -> seek lại
    if (currentTime < startTime) {
      player.seekTo(startTime, true);
    }
  }, [playerRef, trimSettings]);

  useEffect(() => {
    // ⚡ Chỉ polling khi đang play VÀ có trim
    if (!isPlaying || !trimSettings?.isTrimmed) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Polling mỗi 250ms (đủ chính xác, không tốn CPU)
    intervalRef.current = setInterval(checkAndEnforce, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, trimSettings, checkAndEnforce]);

  // Seek to start when trim settings change
  const seekToStart = useCallback(() => {
    const player = playerRef.current;
    if (player && trimSettings?.isTrimmed) {
      player.seekTo(trimSettings.startTime, true);
    }
  }, [playerRef, trimSettings]);

  return { seekToStart, checkAndEnforce };
};
```

### D. Validation Helper

```typescript
// utils/mediaTrimUtils.ts

export const MAX_MEDIA_DURATION_MINUTES = 15;
export const MAX_MEDIA_SIZE_MB = 100;
export const MIN_TRIM_DURATION_SECONDS = 3;

export const validateMediaForTrim = (
  durationSeconds: number,
  fileSizeMB?: number
): { valid: boolean; error?: string } => {
  const maxDurationSeconds = MAX_MEDIA_DURATION_MINUTES * 60;
  
  if (durationSeconds > maxDurationSeconds) {
    return {
      valid: false,
      error: `Video quá dài (${Math.round(durationSeconds / 60)} phút). Tối đa ${MAX_MEDIA_DURATION_MINUTES} phút.`
    };
  }
  
  if (fileSizeMB && fileSizeMB > MAX_MEDIA_SIZE_MB) {
    return {
      valid: false,
      error: `File quá nặng (${fileSizeMB.toFixed(1)}MB). Tối đa ${MAX_MEDIA_SIZE_MB}MB.`
    };
  }
  
  return { valid: true };
};

export const validateTrimRange = (
  startTime: number,
  endTime: number,
  totalDuration: number
): { valid: boolean; error?: string } => {
  if (startTime < 0 || endTime > totalDuration) {
    return { valid: false, error: 'Thời gian không hợp lệ' };
  }
  
  if (endTime - startTime < MIN_TRIM_DURATION_SECONDS) {
    return { valid: false, error: `Đoạn cắt phải dài ít nhất ${MIN_TRIM_DURATION_SECONDS} giây` };
  }
  
  return { valid: true };
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseTime = (timeStr: string): number | null => {
  const match = timeStr.match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
};
```

---

## ✅ ACCEPTANCE CRITERIA

### Must Have (MVP) - Bắt buộc hoàn thành
- [ ] User có thể chọn start/end time cho video trong câu hỏi
- [ ] User có thể chọn start/end time cho audio trong câu hỏi
- [ ] Preview playback hoạt động đúng range đã chọn
- [ ] Quiz playback sử dụng trim settings (dừng đúng endTime)
- [ ] YouTube videos: dùng API polling (KHÔNG dùng ?end= URL)
- [ ] HTML5 video/audio: dùng timeupdate event
- [ ] Mobile: Touch target 24px, full screen modal
- [ ] Validation: file > 15 phút hoặc > 100MB → cảnh báo

### Should Have - Nên có
- [ ] Time input fields với validation mm:ss
- [ ] Hiển thị "Đã cắt: 0:30 - 2:15" trong QuestionEditor
- [ ] Nút "Chỉnh sửa" và "Xóa cắt"
- [ ] i18n: EN/VI translations

### Won't Have (Đã loại bỏ)
- ❌ Audio waveform visualization
- ❌ Video thumbnail strips
- ❌ Learning Resources trimming
- ❌ Server-side processing

---

## 💰 EFFORT ESTIMATION (Đã cập nhật)

| Giai đoạn | Nội dung | Effort | Status |
|-----------|----------|--------|--------|
| GĐ 1 | UI Trimmer (Slider, Modal, TimeInputs) | 4 giờ | ⬜ Not Started |
| GĐ 2 | Logic Phát (useTrimmedControl, useYouTubeTrim) | 3 giờ | ⬜ Not Started |
| GĐ 3 | Tích hợp Quiz Editor | 4 giờ | ⬜ Not Started |
| GĐ 4 | Tích hợp Màn hình Chơi | 3 giờ | ⬜ Not Started |
| GĐ 5 | Testing & i18n | 3 giờ | ⬜ Not Started |
| **TOTAL** | | **17 giờ** | |

### Timeline thực tế
- **MVP hoàn chỉnh**: 2-3 ngày làm việc (17 giờ)

---

## 🚀 ROLLOUT PLAN

### Phase A: Development (2-3 ngày)
1. Cài dependencies
2. Implement theo 5 giai đoạn
3. Self-testing

### Phase B: Code Review & Testing (1 ngày)
- Review code
- Test trên multiple devices (desktop, mobile, tablet)
- Fix bugs

### Phase C: Staging Deploy (0.5 ngày)
- Deploy staging environment
- Test với real data

### Phase D: Production Release
- Deploy production
- Monitor for issues
- Collect feedback

---

## 📝 TỔNG KẾT QUYẾT ĐỊNH

| Câu hỏi | Quyết định | Lý do |
|---------|------------|-------|
| **Scope** | ✅ Chỉ Question Media | Tập trung MVP, giảm 50% work |
| **Waveform** | ❌ Không làm | Nặng, lag, phức tạp mobile |
| **Mobile** | ✅ Bắt buộc tối ưu | Creator dùng iPad/phone nhiều |
| **Duration limit** | ✅ Max 15 phút, 100MB | Tránh crash, slider chính xác |
| **Default** | ✅ Phát toàn bộ (Opt-in) | Tiện lợi, không rác DB |
| **YouTube** | ✅ Dùng API polling | ?end= URL hay hiện quảng cáo |

---

## ⚡ LỜI KHUYÊN TRIỂN KHAI

1. **Làm UI Slider trước**: Đây là phần khó nhất, test cảm giác kéo thả trước
2. **Mobile First**: Nút kéo 24px, modal full screen trên mobile
3. **react-youtube**: Dùng `event.target.getCurrentTime()`, KHÔNG dùng iframe thuần
4. **Không dùng ?end=** trên YouTube URL: hay hiện quảng cáo khi dừng
5. **isTrimmed flag**: Quan trọng để skip logic khi không cần thiết

---

> **Sẵn sàng bắt đầu? Tôi sẽ implement theo thứ tự:**
> 1. Cài dependencies
> 2. Cập nhật `types.ts` với `MediaTrimSettings`
> 3. Tạo `TrimSlider.tsx` component
> 4. Tạo hooks (`useTrimmedControl`, `useYouTubeTrim`)
> 5. Tích hợp vào `MediaUploader` và `QuestionEditor`
