# 🚀 QUICK START GUIDE

## Hướng dẫn nhanh để sử dụng Modern Multiplayer Game Engine

---

## 📦 **ĐÃ CÀI SẴN**

Tất cả components và services đã được tạo sẵn trong:
```
src/features/multiplayer/modern/
├── types/game.types.ts
├── services/gameEngine.ts
├── components/
│   ├── ModernGamePlay.tsx
│   └── game/
│       ├── GameCoordinator.tsx
│       ├── PlayerGameView.tsx
│       ├── SpectatorGameView.tsx
│       ├── HostGameView.tsx
│       ├── QuestionRenderer.tsx
│       ├── PowerUpPanel.tsx
│       └── StreakIndicator.tsx
```

---

## ⚡ **3 BƯỚC ĐỂ BẮT ĐẦU**

### **BƯỚC 1: Update ModernRoomLobby.tsx**

Thêm logic start game vào nút "Bắt đầu":

```typescript
import { gameEngine } from '../services/gameEngine';
import { modernMultiplayerService } from '../services/modernMultiplayerService';

const ModernRoomLobby: React.FC<Props> = ({ ... }) => {
  const handleStartGame = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch quiz questions
      const questions = await modernMultiplayerService.getQuizQuestions(quizId);
      
      // 2. Initialize game engine
      await gameEngine.initializeGame(
        roomId,
        quizId,
        roomData.quizTitle,
        questions,
        currentUser.uid,
        {
          timePerQuestion: 30,
          showAnswerReview: true,
          reviewDuration: 5,
          leaderboardDuration: 3,
          powerUpsEnabled: true,
          streakEnabled: true,
          spectatorMode: true,
          autoStart: false,
        }
      );
      
      // 3. Start the game
      await gameEngine.startGame(roomId, questions);
      
      // 4. Navigate to game view
      onStartGame(); // This will switch view to 'game-play'
      
    } catch (error) {
      console.error('Failed to start game:', error);
      showToast('Không thể bắt đầu trò chơi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    // ... existing JSX
    <button 
      onClick={handleStartGame}
      disabled={!allReady || loading}
    >
      {loading ? 'Đang khởi động...' : 'Bắt đầu'}
    </button>
  );
};
```

### **BƯỚC 2: Update ModernMultiplayerPage.tsx**

Đảm bảo truyền đúng props cho ModernGamePlay:

```typescript
const ModernMultiplayerPage: React.FC = () => {
  const [view, setView] = useState<View>('quiz-selection');
  const [roomId, setRoomId] = useState<string>('');
  const currentUser = useCurrentUser();
  
  return (
    <div>
      {view === 'quiz-selection' && (
        <ModernQuizSelector onSelect={handleQuizSelect} />
      )}
      
      {view === 'room-lobby' && (
        <ModernRoomLobby
          roomId={roomId}
          onStartGame={() => setView('game-play')}
          onLeave={() => setView('quiz-selection')}
        />
      )}
      
      {view === 'game-play' && (
        <ModernGamePlay
          roomId={roomId}
          currentUserId={currentUser.uid}
          onGameEnd={() => setView('game-results')}
        />
      )}
      
      {view === 'game-results' && (
        <ModernGameResults
          roomId={roomId}
          onPlayAgain={() => setView('room-lobby')}
          onExit={() => setView('quiz-selection')}
        />
      )}
    </div>
  );
};
```

### **BƯỚC 3: Test!**

1. Tạo room mới
2. Mời bạn bè join (hoặc dùng 2 browsers)
3. Bấm "Bắt đầu"
4. Game tự động chạy! 🎮

---

## 🎯 **FLOW HOẠT ĐỘNG**

```
1. User ở Lobby
   ↓
2. Host bấm "Bắt đầu"
   ↓
3. gameEngine.initializeGame()
   ├─ Tạo game state trong RTDB
   ├─ Set questions
   └─ Initialize player data
   ↓
4. gameEngine.startGame()
   ├─ Status: starting
   ├─ Countdown 3 giây
   └─ Start question đầu tiên
   ↓
5. ModernGamePlay renders
   ↓
6. GameCoordinator
   ├─ Listen game state
   ├─ Detect role
   └─ Route to view:
       ├─ Host → HostGameView
       ├─ Player → PlayerGameView
       └─ Spectator → SpectatorGameView
   ↓
7. Players chơi game
   ├─ Submit answers
   ├─ Earn points
   ├─ Streak bonuses
   └─ Use power-ups
   ↓
8. Game kết thúc
   ├─ Show results
   └─ Navigate to ModernGameResults
```

---

## 📋 **CHECKLIST INTEGRATION**

### **Trong ModernRoomLobby.tsx:**
- [ ] Import `gameEngine` từ '../services/gameEngine'
- [ ] Thêm `handleStartGame` function
- [ ] Call `gameEngine.initializeGame()`
- [ ] Call `gameEngine.startGame()`
- [ ] Handle errors với toast
- [ ] Add loading state

### **Trong ModernMultiplayerPage.tsx:**
- [ ] Import `ModernGamePlay`
- [ ] Add 'game-play' view
- [ ] Pass `roomId`, `currentUserId`, `onGameEnd` props
- [ ] Handle navigation flow

### **Testing:**
- [ ] Test với 1 player (single mode)
- [ ] Test với 2+ players (multiplayer)
- [ ] Test tất cả 8 loại câu hỏi
- [ ] Test power-ups
- [ ] Test streak system
- [ ] Test host controls (pause/resume/skip)
- [ ] Test spectator view
- [ ] Test reconnect
- [ ] Test error cases

---

## 🐛 **DEBUGGING TIPS**

### **Nếu game không start:**
```typescript
// Check console logs:
console.log('Game State:', gameState);
console.log('Questions:', questions);
console.log('Room ID:', roomId);

// Verify RTDB path:
// Firebase Console → Realtime Database
// Check: games/{roomId}/
```

### **Nếu views không hiện:**
```typescript
// Check GameCoordinator:
console.log('Current User ID:', currentUserId);
console.log('Game State:', gameState);
console.log('Player Role:', gameState.players[currentUserId]?.role);
```

### **Nếu answers không submit:**
```typescript
// Check answer submission:
console.log('Selected Answer:', selectedAnswer);
console.log('Active Power-ups:', activePowerUps);

// Verify gameEngine.submitAnswer() được gọi
```

---

## 🎨 **CUSTOMIZATION**

### **Thay đổi game settings:**
```typescript
await gameEngine.initializeGame(roomId, quizId, title, questions, hostId, {
  timePerQuestion: 45,        // 45 giây/câu thay vì 30
  powerUpsEnabled: false,     // Tắt power-ups
  streakEnabled: false,       // Tắt streak
  showAnswerReview: false,    // Không show review
  // ...
});
```

### **Custom scoring:**
Sửa trong `types/game.types.ts`:
```typescript
export const DEFAULT_SCORING: ScoringConfig = {
  basePoints: 200,              // 200 điểm/câu thay vì 100
  timeBonus: false,             // Tắt time bonus
  streakEnabled: true,
  difficultyMultiplier: {
    easy: 1.0,
    medium: 2.0,                // Tăng từ 1.5 lên 2.0
    hard: 3.0,                  // Tăng từ 2.0 lên 3.0
  },
};
```

### **Thêm power-ups mới:**
Trong `components/game/PowerUpPanel.tsx`:
```typescript
const POWER_UPS: PowerUpConfig[] = [
  // ... existing power-ups
  {
    type: 'your_new_powerup',
    name: 'Tên Power-up',
    description: 'Mô tả',
    icon: YourIcon,
    cost: 100,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-500',
  },
];
```

---

## 📚 **API REFERENCE**

### **gameEngine Methods:**

```typescript
// Initialize game
await gameEngine.initializeGame(
  roomId: string,
  quizId: string,
  quizTitle: string,
  questions: Question[],
  hostId: string,
  settings?: GameSettings
): Promise<void>

// Start game
await gameEngine.startGame(
  roomId: string,
  questions: Question[]
): Promise<void>

// Submit answer
await gameEngine.submitAnswer(
  roomId: string,
  playerId: string,
  answer: any,
  activePowerUps?: PowerUpType[]
): Promise<void>

// Use power-up
await gameEngine.usePowerUp(
  roomId: string,
  playerId: string,
  powerUpType: PowerUpType
): Promise<void>

// Host controls
await gameEngine.pauseGame(roomId: string): Promise<void>
await gameEngine.resumeGame(roomId: string): Promise<void>
await gameEngine.finishGame(roomId: string): Promise<void>

// Get spectator data
const data = await gameEngine.getSpectatorViewData(
  roomId: string
): Promise<SpectatorViewData | null>
```

---

## 🎓 **EXAMPLES**

### **Example 1: Basic Game Start**
```typescript
const handleStart = async () => {
  const questions = await fetchQuestions(quizId);
  await gameEngine.initializeGame(roomId, quizId, title, questions, hostId);
  await gameEngine.startGame(roomId, questions);
  navigate('game-play');
};
```

### **Example 2: Custom Settings Game**
```typescript
const handleStart = async () => {
  const questions = await fetchQuestions(quizId);
  
  await gameEngine.initializeGame(roomId, quizId, title, questions, hostId, {
    timePerQuestion: 60,
    powerUpsEnabled: false,
    streakEnabled: true,
    spectatorMode: false,
  });
  
  await gameEngine.startGame(roomId, questions);
  navigate('game-play');
};
```

### **Example 3: With Error Handling**
```typescript
const handleStart = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const questions = await fetchQuestions(quizId);
    
    if (questions.length === 0) {
      throw new Error('No questions found');
    }
    
    await gameEngine.initializeGame(
      roomId, quizId, title, questions, hostId
    );
    
    await gameEngine.startGame(roomId, questions);
    
    navigate('game-play');
  } catch (err) {
    setError(err.message);
    showToast('Failed to start game', 'error');
  } finally {
    setLoading(false);
  }
};
```

---

## ✅ **DONE!**

Bạn đã sẵn sàng để chạy modern multiplayer game! 🎉

**Nếu có vấn đề:**
1. Check console logs
2. Verify Firebase RTDB rules
3. Check network tab
4. Review COMPLETE_SUMMARY.md

**Cần thêm features?**
- Xem IMPLEMENTATION_STATUS.md
- Mở rộng gameEngine.ts
- Thêm components mới

---

**Happy Gaming! 🎮**
