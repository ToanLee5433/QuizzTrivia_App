# 🎮 Multiplayer Testing Guide

## ✅ Các thay đổi đã thực hiện

### 1. 🔊 Sound Service Improvements
**File:** `src/features/multiplayer/services/soundService.ts`

**Thay đổi:**
- ✅ Bật `preload: true` cho tất cả âm thanh (thay vì `false`)
- ✅ Thêm `onload` callback để log khi âm thanh load thành công
- ✅ Thêm detailed error logging với emoji icons
- ✅ Sửa unused parameter warning (`_id`)

**Âm thanh có sẵn:**
```
✅ correct.mp3    - Đáp án đúng
✅ wrong.mp3      - Đáp án sai
✅ countdown.mp3  - Đếm ngược
✅ gameStart.mp3  - Bắt đầu game
✅ tick.mp3       - Tick timer
✅ transition.mp3 - Chuyển câu hỏi
✅ powerup.mp3    - Kích hoạt power-up
✅ kick.mp3       - Kick player
✅ + 17 files khác (lobby music, victory, etc.)
```

### 2. 👟 Kick Player Feature
**File:** `src/features/multiplayer/components/RoomLobby.tsx`

**Thay đổi:**
- ✅ Thêm `import { toast }` để hiển thị thông báo
- ✅ Cải thiện `handleKickPlayer` với logging chi tiết
- ✅ Thêm TypeScript type annotation cho Cloud Function
- ✅ Toast notifications thay vì `alert()`:
  - Success: "{{playerName}} đã bị xóa khỏi phòng"
  - Error: "Không thể đuổi người chơi: {{error}}"
- ✅ Thêm i18n translation keys:
  - `multiplayer.kickPlayer`
  - `multiplayer.kickConfirm`
  - `multiplayer.kickSuccess`
  - `multiplayer.kickFailed`

**UI:**
- Nút kick chỉ hiện khi hover vào player card
- Chỉ host mới thấy nút kick
- Không thể kick bản thân hoặc host khác
- Icon: `UserMinus` màu đỏ

### 3. ☁️ Cloud Functions
**File:** `functions/src/multiplayer/index.ts`, `functions/src/index.ts`

**Functions đã có:**
- ✅ `validateAnswer` - Server-side scoring (chống hack)
- ✅ `kickPlayer` - Đuổi người chơi (chỉ host)
- ✅ `getPlayerQuestions` - Shuffle câu hỏi cho mỗi người
- ✅ `checkRateLimit` - Chống spam
- ✅ `archiveCompletedRooms` - Dọn dẹp phòng cũ

## 🧪 Testing Checklist

### A. Sound Testing

#### 1. Lobby Sounds
- [ ] Vào phòng multiplayer lobby
- [ ] Click nút music icon (Volume2/VolumeX)
- [ ] **Expect:** Lobby music phát (lobby-music.mp3)
- [ ] Click lại nút music
- [ ] **Expect:** Music dừng

#### 2. Power-up Sounds
- [ ] Bắt đầu game multiplayer
- [ ] Trong câu hỏi, click power-up button (50/50, x2-score, freeze-time)
- [ ] **Expect:** Âm thanh "powerup.mp3" phát
- [ ] Mở browser console (F12)
- [ ] **Expect:** Log `🎵 Playing sound: powerup`

#### 3. Answer Sounds
- [ ] Trả lời đúng một câu hỏi
- [ ] **Expect:** Âm thanh "correct.mp3" phát + animation xanh
- [ ] Trả lời sai một câu hỏi
- [ ] **Expect:** Âm thanh "wrong.mp3" phát + animation đỏ

#### 4. Check Console Logs
Mở DevTools Console (F12) và tìm:
```
🎵 Sound service initialized
  enabled: true
  volume: 0.5
  soundsLoaded: 7

✅ Sound loaded successfully: correct
✅ Sound loaded successfully: wrong
✅ Sound loaded successfully: powerup
⚠️ Sound file failed to load: [tên file nếu có lỗi]
```

**Nếu không có âm thanh:**
1. Kiểm tra volume browser không bị mute
2. Kiểm tra Console có lỗi `⚠️ Sound file failed to load`
3. Kiểm tra `localStorage` key `soundEnabled` = "true"
4. Verify file tồn tại: `/public/sounds/powerup.mp3`

### B. Kick Player Testing

#### Prerequisites
- Cần 2 accounts (hoặc 2 browsers)
- Account 1: Host (tạo phòng)
- Account 2: Guest (join phòng)

#### Test Flow

**1. Tạo phòng (Account 1 - Host):**
```
1. Login → Multiplayer → Create Room
2. Copy room code
3. Mở Console (F12) để xem logs
```

**2. Join phòng (Account 2 - Guest):**
```
1. Login (account khác) → Multiplayer → Join Room
2. Paste room code
3. Join
```

**3. Test Kick (Host side):**
```
✅ Hover vào player card của Guest
   → Expect: Nút đỏ với icon UserMinus xuất hiện

✅ Click nút kick
   → Expect: Confirm dialog hiện: "Bạn có chắc muốn đuổi [PlayerName] khỏi phòng?"

✅ Click OK
   → Expect: 
     - Console log: "🚀 Kicking player: { playerId, playerName, roomId }"
     - Sau 1-2s: "✅ Player kicked successfully"
     - Toast notification xanh: "[PlayerName] đã bị xóa khỏi phòng"
     - Guest player card biến mất khỏi lobby

✅ Check Guest screen:
   → Expect: Bị redirect về multiplayer lobby hoặc home
```

**4. Test Host Protection:**
```
✅ Hover vào player card của chính Host
   → Expect: KHÔNG có nút kick (không thể kick bản thân)

✅ Nếu có 2 host (bug):
   → Expect: Host A không thể kick Host B
```

**5. Test Guest Permission:**
```
❌ Guest không thể kick bất kỳ ai
   → Expect: Nút kick KHÔNG hiện với Guest
```

#### Expected Console Logs (Host side)
```javascript
🚀 Kicking player: {
  playerId: "abc123...",
  playerName: "Guest User",
  roomId: "XYZ123"
}

// Sau vài giây:
✅ Player kicked successfully: {
  data: {
    success: true,
    message: "Player kicked successfully"
  }
}
```

#### Expected Errors (nếu có)

**Error 1: Cloud Function chưa deploy**
```
❌ Failed to kick player: internal
   Cloud function kickPlayer not found
```
**Solution:** Chạy `firebase deploy --only functions`

**Error 2: Không phải host**
```
❌ Failed to kick player: permission-denied
   Only the host can kick players
```
**Solution:** Đảm bảo đang login bằng account tạo phòng

**Error 3: Missing parameters**
```
❌ Cannot kick player - missing requirements: {
  hasService: true,
  hasRoomId: true,
  isHost: false  ← Vấn đề ở đây
}
```
**Solution:** Verify `roomData.hostId === currentUserId`

### C. Power-ups Testing

#### 1. 50/50 Power-up
```
✅ Click nút "50/50" trong game
   → Expect:
     - 2 đáp án sai bị gạch đỏ với icon X
     - Toast: "Loại bỏ 2 đáp án sai activated!"
     - Âm thanh powerup.mp3 phát
     - Không click được vào đáp án bị eliminated
```

#### 2. x2 Score Power-up
```
✅ Click nút "x2" trước khi trả lời
   → Expect:
     - Toast: "Nhân đôi điểm activated!"
     - Âm thanh powerup.mp3 phát
     - Trả lời đúng → Điểm nhận được = (Base score + Speed bonus) * 2
```

#### 3. Freeze Time Power-up
```
✅ Click nút "Freeze" khi timer đang chạy
   → Expect:
     - Toast: "Dừng thời gian activated!"
     - Âm thanh powerup.mp3 phát
     - Timer dừng trong 5 giây
     - Sau 5s timer tiếp tục chạy
```

### D. Server-side Scoring Testing

#### Verify Server Validation
```javascript
// Mở Console (F12) khi trả lời câu hỏi

✅ Expect log:
"🔒 Answer validated by server: {
  isCorrect: true/false,
  points: 1250,
  correctAnswer: 2,
  timeToAnswer: 3500
}"

❌ Nếu thấy:
"⚠️ Server validation failed, using client-side calculation"
→ Cloud function validateAnswer chưa deploy hoặc bị lỗi
```

## 🐛 Troubleshooting

### Âm thanh không phát
1. Check console: `⚠️ Sound file failed to load`
2. Verify file: `ls public/sounds/powerup.mp3`
3. Check browser volume không mute
4. Clear cache: Ctrl+Shift+R

### Kick player không hoạt động
1. Check console log có `❌ Cannot kick player`?
2. Verify Cloud Function deployed: `firebase functions:list | grep kickPlayer`
3. Check Firebase Auth token còn hạn: Re-login
4. Verify host ID: `roomData.hostId === currentUserId`

### Power-ups không hoạt động
1. Check `powerUpsService.ts` imported đúng chưa
2. Verify Realtime Database rules cho phép write `/rooms/{roomId}/powerUps`
3. Check console log error từ Firebase RTDB

## 📊 Performance Monitoring

### Metrics to Check
- Sound load time: < 200ms (check Network tab)
- Kick player latency: < 2s (from click to player removed)
- Power-up sync delay: < 500ms (across all clients)
- Server validation time: < 1s (answer submission)

## 🚀 Next Steps After Testing

1. ✅ Tất cả âm thanh hoạt động
2. ✅ Kick player hoạt động mượt
3. ✅ Power-ups đồng bộ real-time
4. ✅ Server scoring không bị bypass

→ **READY FOR PRODUCTION** 🎉

## 📝 Known Issues

### Issue 1: Howler.js Audio Context
- **Problem:** iOS Safari cần user interaction mới phát âm thanh
- **Workaround:** Player phải click 1 lần trước (nút Ready)

### Issue 2: Cloud Function Cold Start
- **Problem:** Lần đầu gọi validateAnswer/kickPlayer có thể chậm (5-10s)
- **Solution:** Firebase Cloud Functions tự động warm up sau vài request

### Issue 3: RTDB Listener Delay
- **Problem:** Power-up sync có độ trễ 200-500ms
- **Expected:** Đây là latency bình thường của Realtime Database

## 🎯 Success Criteria

✅ **Sounds:**
- All 7 sound types load successfully
- No console errors `⚠️ Sound file failed to load`
- Sounds play on correct events

✅ **Kick Player:**
- Host can kick guests
- Guest removed instantly (< 2s)
- Toast notifications appear
- No permission errors

✅ **Power-ups:**
- All 3 types activate correctly
- Visual feedback (animations, overlays)
- Sync across all players < 500ms

✅ **Server Scoring:**
- All answers validated server-side
- No client-side score manipulation possible
- Logs show "validated by server"

---

**Deploy Status:**
- ⏳ Cloud Functions: Deploying...
- ✅ Client Build: Success
- ✅ Assets: 29/29 downloaded

**Test Environment:**
- Firebase Project: `datn-quizapp`
- Region: `us-central1`
- Node Version: v22.18.0
