# 🧪 TEST GUIDE - MODERN MULTIPLAYER

## 🚀 **CHUẨN BỊ (1 LẦN DUY NHẤT)**

### **Bước 1: Deploy Firebase Rules** ⚠️ **QUAN TRỌNG!**

```bash
# Chạy script tự động:
.\deploy-rules.bat

# HOẶC chạy manual:
firebase deploy --only database
firebase deploy --only firestore:rules
```

**Xác nhận thành công:**
```
✔  Deploy complete!
```

---

## 🎮 **TEST FLOW - SINGLE PLAYER**

### **Bước 1: Start Dev Server**

```bash
npm run dev
```

Mở browser: http://localhost:5173

### **Bước 2: Login**

- Đăng nhập với tài khoản Firebase
- Hoặc tạo tài khoản mới

### **Bước 3: Navigate to Multiplayer**

```
Sidebar → Multiplayer / Chơi Multiplayer
```

### **Bước 4: Select Quiz**

1. Chọn một quiz từ danh sách
2. Click "Tạo phòng"
3. Điền thông tin:
   - Room name: "Test Game"
   - Max players: 4
   - Password: (tùy chọn)

### **Bước 5: Trong Lobby**

**Mở F12 Console để xem logs:**

```javascript
// Expected logs:
🎮 isHost calculation: { hostId: "...", currentUserId: "...", isHost: true }
```

**Kiểm tra UI:**
```
✅ Room code hiển thị
✅ Player list (bạn là host)
✅ Host Controls panel hiện ra:
   ┌─────────────────────────┐
   │ 👑 Host Controls        │
   │ [Switch to Spectator]   │
   └─────────────────────────┘
✅ Chat box
✅ Connection status
```

### **Bước 6: Ready & Start**

1. Click nút "Ready" (hoặc không cần nếu bạn là host)
2. Click "Bắt đầu" button (chỉ hiện khi ready)

**Expected Console Logs:**
```
🎮 Starting game with new engine...
📚 Fetching quiz questions...
✅ Loaded 10 questions
🎯 Initializing game engine...
✅ Game engine initialized
🚀 Starting game countdown...
✅ Game started successfully!
```

### **Bước 7: Play Game**

1. **Countdown:** 3...2...1...
2. **Question appears** với timer đếm ngược
3. **Chọn đáp án** và click "Xác nhận"
4. **Kết quả** hiển thị (✅ hoặc ❌)
5. **Điểm** và **streak** được tính
6. **Next question** tự động

### **Bước 8: Game End**

- Leaderboard hiển thị
- Final scores
- Options: Play Again / Exit

---

## 👥 **TEST FLOW - MULTIPLAYER (2 PLAYERS)**

### **Setup:**

```
Browser 1 (Chrome)         Browser 2 (Firefox/Incognito)
     HOST                         PLAYER
```

### **Browser 1 (Host):**

1. Create room như trên
2. Copy room code (6 ký tự)
3. Share code với Browser 2
4. **ĐỢI player join**

### **Browser 2 (Player):**

1. Navigate to Multiplayer
2. Click "Tham gia phòng"
3. Nhập room code
4. Click Join

### **Browser 1 (Host) - Verify:**

```
✅ Player 2 xuất hiện trong list
✅ Player count: 2/4
✅ Ready status của Player 2
```

### **Browser 2 (Player) - Actions:**

1. Click "Ready" button
2. Đợi host start game

### **Browser 1 (Host) - Start:**

1. Nút "Bắt đầu" sáng lên (khi có player ready)
2. Click "Bắt đầu"

### **CẢ 2 BROWSERS:**

```
✅ Cùng thấy countdown 3...2...1
✅ Cùng thấy câu hỏi
✅ Timer sync real-time
✅ Answer và xem kết quả
✅ Leaderboard cập nhật live
✅ Next question cùng lúc
```

---

## 🎯 **CHECKLIST - FEATURES TO TEST**

### **Core Features:**
- [ ] Room creation works
- [ ] Room joining with code works
- [ ] Player list updates real-time
- [ ] Chat messages send/receive
- [ ] Ready status toggles
- [ ] Host can start game

### **Game Features:**
- [ ] Countdown appears
- [ ] Questions display correctly
- [ ] Timer counts down (30s)
- [ ] Answer selection works
- [ ] Submit answer works
- [ ] Results show correct/incorrect
- [ ] Points calculated correctly
- [ ] Next question auto-advances

### **Host Features:**
- [ ] Host Controls panel visible
- [ ] "Switch to Spectator" button works
- [ ] Can pause/resume (if implemented)
- [ ] Can skip question (if implemented)
- [ ] Can end game early

### **Advanced Features:**
- [ ] Streak system (3+ correct answers)
- [ ] Power-ups display and work
- [ ] Spectator mode (if someone switches)
- [ ] Reconnect after disconnect

---

## 🐛 **COMMON ISSUES & FIXES**

### **1. ERR_BLOCKED_BY_CLIENT**

**Cause:** Ad blocker blocking Firebase requests

**Fix:**
```
1. Disable ad blocker (uBlock, AdBlock, etc.)
2. Test in Incognito mode
3. Whitelist localhost and firebase domains
```

### **2. Host Controls Không Hiện**

**Check Console:**
```javascript
🎮 isHost calculation: { isHost: false }  ← WRONG!
```

**Fix:**
```
1. Đợi 2-3 giây để roomData load
2. Refresh page
3. Check roomData trong console:
   console.log(roomData)
```

### **3. "No questions found"**

**Cause:** Quiz không có questions hoặc không load được

**Fix:**
```
1. Chọn quiz khác
2. Check quiz có questions trong Firestore
3. Check console errors
```

### **4. Game Không Start**

**Check Console Errors:**
```javascript
// Should see:
✅ Loaded X questions
✅ Game engine initialized
✅ Game started successfully

// If errors, check:
1. Firebase rules deployed?
2. RTDB có path games/?
3. Questions loaded?
```

### **5. Timer Không Đếm Ngược**

**Fix:**
```
1. Refresh page
2. Check browser console for errors
3. Verify RTDB connection
```

---

## 📱 **TEST ON MOBILE**

### **Responsive Test:**

```
Desktop:  http://localhost:5173
Mobile:   http://192.168.x.x:5173
```

**Find your IP:**
```bash
ipconfig
# Look for: IPv4 Address
```

**Test Features:**
- Touch controls work
- Buttons tap correctly
- Timer visible
- Question readable
- Chat usable

---

## 🎨 **TEST UI/UX**

### **Visual Checks:**

- [ ] Gradients render smoothly
- [ ] Animations are smooth (60fps)
- [ ] Colors contrast well
- [ ] Text readable
- [ ] Icons display correctly
- [ ] Loading states show
- [ ] Error messages clear

### **Interactions:**

- [ ] Buttons hover effects
- [ ] Click feedback
- [ ] Transitions smooth
- [ ] Modals open/close nicely
- [ ] Toast notifications appear

---

## 📊 **PERFORMANCE TEST**

### **Check:**

```javascript
// Open Performance tab in DevTools
// Record while playing

Expected:
✅ FPS: 50-60
✅ Memory: < 100MB
✅ Network: < 1MB/min
✅ CPU: < 30%
```

---

## ✅ **SUCCESS CRITERIA**

Game is ready if:

```
✅ Can create room
✅ Can join room
✅ Can play game solo
✅ Can play with 2+ players
✅ Questions display correctly
✅ Scoring works
✅ Leaderboard updates
✅ No console errors
✅ No blocking errors
✅ UI looks good
```

---

## 🎯 **QUICK TEST (5 MINUTES)**

```bash
# Terminal 1
npm run dev

# Browser
1. Login
2. Multiplayer
3. Select quiz → Create room
4. Click "Bắt đầu" (or Ready first)
5. Play 3-5 questions
6. Verify scores

✅ If works → SUCCESS!
❌ If errors → Check console & COMMON ISSUES
```

---

## 📞 **NEED HELP?**

### **Debug Steps:**

1. **Open F12 Console**
2. **Check for errors** (red text)
3. **Check Network tab** (failed requests)
4. **Check Application tab** (localStorage, cookies)

### **Common Errors:**

```javascript
// Firebase permission denied
→ Deploy rules: firebase deploy --only database

// Cannot read properties of undefined
→ Wait for data to load or check null values

// ERR_BLOCKED_BY_CLIENT
→ Disable ad blocker
```

---

## 🎉 **READY TO TEST!**

**Start here:**
```bash
# 1. Deploy rules (ONE TIME)
.\deploy-rules.bat

# 2. Start dev server
npm run dev

# 3. Open browser
# 4. Follow "TEST FLOW - SINGLE PLAYER"
# 5. Have fun! 🎮
```

**Good luck! 🚀**
