# 🚀 START TESTING - QUICK GUIDE

## ⚡ **CHUẨN BỊ - 3 BƯỚC (2 PHÚT)**

### **Bước 1: Deploy Firebase Rules** ⚠️ **QUAN TRỌNG - LÀM 1 LẦN!**

**Option A - Script tự động (Khuyên dùng):**
```bash
.\deploy-rules.bat
```

**Option B - Manual:**
```bash
firebase deploy --only database
firebase deploy --only firestore:rules
```

**✅ Thành công khi thấy:**
```
✔  Deploy complete!
```

---

### **Bước 2: Tắt Ad Blocker** (Nếu có)

```
- uBlock Origin → Tắt cho localhost
- AdBlock Plus → Tắt cho localhost
- Hoặc test với Incognito mode
```

---

### **Bước 3: Start Dev Server**

```bash
npm run dev
```

**Mở:** http://localhost:5173

---

## 🎮 **TEST NGAY - 5 PHÚT**

### **1. Login**
- Đăng nhập với tài khoản Firebase
- Hoặc tạo tài khoản mới

### **2. Vào Multiplayer**
```
Sidebar → Multiplayer
```

### **3. Tạo Room**
1. Chọn quiz bất kỳ
2. Click "Tạo phòng"
3. Điền:
   - Room name: "Test"
   - Max players: 4
4. Click "Tạo"

### **4. Kiểm Tra Lobby** ✅

**Mở F12 Console (Quan trọng!):**

Phải thấy log này:
```javascript
🎮 isHost calculation: { 
  hostId: "...", 
  currentUserId: "...", 
  isHost: true   ← Phải là TRUE!
}
```

**Check UI:**
```
✅ Room code hiển thị (6 ký tự)
✅ Bạn trong player list
✅ Host Controls panel hiện:
   ┌─────────────────────────┐
   │ 👑 Host Controls        │
   │ [Switch to Spectator]   │
   └─────────────────────────┘
✅ Chat box
```

### **5. Start Game**

Click "Bắt đầu" button

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

### **6. Play!**

```
✅ Countdown 3...2...1...
✅ Câu hỏi xuất hiện
✅ Timer đếm ngược
✅ Chọn đáp án
✅ Click "Xác nhận đáp án"
✅ Kết quả hiện (✓ hoặc ✗)
✅ Điểm cộng
✅ Next question tự động
```

### **7. End Game**

```
✅ Leaderboard hiển thị
✅ Final score
✅ Options: Play Again / Exit
```

---

## 🎯 **CHECKLIST NHANH**

Test thành công nếu:

- [ ] ✅ Tạo room được
- [ ] ✅ Host Controls hiện ra
- [ ] ✅ Click Start được
- [ ] ✅ Countdown xuất hiện
- [ ] ✅ Questions hiển thị
- [ ] ✅ Submit answer được
- [ ] ✅ Kết quả đúng
- [ ] ✅ Điểm tính đúng
- [ ] ✅ Next question tự động
- [ ] ✅ Leaderboard hiển thị

---

## ❌ **NẾU CÓ LỖI**

### **Lỗi 1: ERR_BLOCKED_BY_CLIENT**

```bash
# Fix:
1. Tắt hoàn toàn ad blocker
2. Test với Incognito mode (Ctrl + Shift + N)
3. Whitelist localhost
```

### **Lỗi 2: Host Controls Không Hiện**

```javascript
// Check console log:
🎮 isHost calculation: { isHost: false }  ← SAI!

// Fix:
1. Đợi 2-3 giây
2. Refresh page
3. Check: console.log(roomData)
```

### **Lỗi 3: "No questions found"**

```bash
# Fix:
1. Chọn quiz khác
2. Check quiz có questions
3. Check console errors
```

### **Lỗi 4: Game Không Start**

```bash
# Check console:
✅ Loaded X questions  ← Phải có
✅ Game engine initialized  ← Phải có
✅ Game started successfully  ← Phải có

# Nếu không có:
1. Deploy rules chưa? → .\deploy-rules.bat
2. Refresh page
3. Check F12 → Network tab
```

---

## 👥 **TEST 2 PLAYERS (Optional)**

### **Browser 1 (Host):**
1. Create room
2. Copy room code
3. Đợi player join

### **Browser 2 (Player):**
1. Multiplayer → "Tham gia phòng"
2. Nhập room code
3. Click "Ready"

### **Browser 1 (Host):**
1. Click "Bắt đầu"
2. Cả 2 browsers cùng thấy game!

---

## 📊 **EXPECTED RESULTS**

### **Single Player Test:**
```
✅ Room created: 30 seconds
✅ Game started: 10 seconds
✅ Play 5 questions: 2-3 minutes
✅ Total test time: < 5 minutes
```

### **Multi Player Test:**
```
✅ Player join: 30 seconds
✅ Game sync: Real-time
✅ Both play together: 3-5 minutes
```

---

## 📖 **CHI TIẾT HƠN**

- **Full test guide:** `TEST_GUIDE.md`
- **Firebase rules fix:** `FIREBASE_RULES_FIX.md`
- **Complete summary:** `COMPLETE_SUMMARY.md`

---

## 🎉 **SẴN SÀNG!**

```bash
# Step 1: Deploy rules (1 time only)
.\deploy-rules.bat

# Step 2: Start server
npm run dev

# Step 3: Test!
# Open: http://localhost:5173
# Follow steps above

# Should work! 🚀
```

---

## 💡 **TIPS**

1. **Always open F12 Console** để xem logs
2. **Check isHost: true** trong console
3. **Tắt ad blocker** nếu có lỗi
4. **Test với Incognito** nếu không chắc
5. **Đọc console logs** để debug

---

## 📞 **CẦN GIÚP?**

### **Debug Quick:**

```javascript
// Paste vào console:
console.log('Room:', roomData);
console.log('Is Host?', roomData?.hostId === currentUserId);
console.log('Current User:', currentUserId);
```

### **Check Firebase:**
1. Firebase Console → Realtime Database
2. Check có path `games/` chưa?
3. Check `rooms/{roomId}/players`

---

## ✨ **GOOD LUCK!**

**Everything is ready. Just follow the steps above! 🎮🚀**

Nếu test thành công → 🎉 **CONGRATULATIONS!**

Nếu có lỗi → Check console logs & follow troubleshooting!
