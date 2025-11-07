# 🎮 MULTIPLAYER ARCHITECTURE V2.0

## 📐 Kiến trúc tổng quan

### **Hybrid Database Strategy**
- **Firestore**: Persistent data (rooms metadata, quiz data, final scores)
- **Realtime Database**: Live sync data (chat, presence, timer, answer progress)

```
┌─────────────────────────────────────────────────────────────┐
│                    MULTIPLAYER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  FIRESTORE   │         │  REALTIME DB │                 │
│  └──────────────┘         └──────────────┘                 │
│        │                        │                           │
│  ┌─────▼──────────────┐  ┌─────▼──────────────────┐        │
│  │ multiplayer_rooms  │  │ rooms/{roomId}/        │        │
│  │  - metadata        │  │  - chat/              │        │
│  │  - settings        │  │  - presence/          │        │
│  │  - quiz data       │  │  - game/timer         │        │
│  │  - final scores    │  │  - answerProgress/    │        │
│  │                    │  │  - playerStatuses/    │        │
│  └────────────────────┘  └────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔥 Firestore Structure

```
multiplayer_rooms/{roomId}
├── code: string (6-digit room code)
├── name: string
├── maxPlayers: number
├── isPrivate: boolean
├── password: string | null
├── status: 'waiting' | 'playing' | 'finished'
├── quizId: string
├── quiz: {
│   ├── id: string
│   ├── title: string
│   ├── description: string
│   └── questions: Question[]
│   }
├── settings: {
│   ├── timePerQuestion: number (seconds)
│   ├── showLeaderboard: boolean
│   └── allowLateJoin: boolean
│   }
├── createdAt: Timestamp
└── updatedAt: Timestamp

multiplayer_rooms/{roomId}/players/{playerId}
├── id: string (userId)
├── username: string
├── isReady: boolean
├── isOnline: boolean
├── score: number
├── answers: Answer[]
└── joinedAt: Timestamp

multiplayer_rooms/{roomId}/submissions/{submissionId}
├── playerId: string
├── questionId: string
├── answer: string
├── isCorrect: boolean
├── timeSpent: number
├── pointsEarned: number
└── submittedAt: Timestamp
```

## ⚡ Realtime Database Structure

```
rooms/{roomId}/
├── chat/
│   └── {messageId}/
│       ├── userId: string
│       ├── username: string
│       ├── message: string
│       ├── timestamp: number
│       └── type: 'user' | 'system'
│
├── presence/
│   └── {userId}/
│       ├── isOnline: boolean
│       ├── lastSeen: number
│       └── username: string
│
├── playerStatuses/
│   └── {userId}/
│       ├── isReady: boolean
│       └── updatedAt: number
│
├── game/
│   ├── currentQuestion: number
│   ├── timer/
│   │   ├── timeLeft: number
│   │   ├── isRunning: boolean
│   │   └── updatedAt: number
│   └── updatedAt: number
│
└── answerProgress/
    └── {userId}/
        ├── hasAnswered: boolean
        └── answeredAt: number
```

## 🎯 Game Flow & Synchronization

### **Phase 1: Room Creation & Joining**
```
1. User creates room → Firestore (metadata) + RTDB (presence)
2. Generate unique 6-digit code
3. Host joins as first player
4. Other players join via code
5. Real-time presence tracking in RTDB
```

### **Phase 2: Pre-game Lobby**
```
1. Players see real-time list (RTDB presence)
2. Players click "Ready" button
3. Ready status synced via RTDB /playerStatuses
4. When ALL players ready → Auto countdown 5 seconds
5. Countdown visible to all (synchronized)
```

### **Phase 3: Game Start (Synchronized)**
```
1. Game starts at EXACT same time for all players
2. Server sets game/currentQuestion = 0 in RTDB
3. All clients listen to game/currentQuestion change
4. Timer synced via RTDB game/timer
5. Question displayed simultaneously
```

### **Phase 4: Answering Questions**
```
1. Each player submits answer → Firestore /submissions
2. Player marks hasAnswered in RTDB /answerProgress
3. Real-time progress bar shows who answered
4. When ALL answered OR timer=0 → Next question
```

### **Phase 5: Question Transition**
```
1. Show correct answer + explanations (3 seconds)
2. Update scores visually
3. Leaderboard animation
4. Increment game/currentQuestion in RTDB
5. All clients auto-advance together
```

### **Phase 6: Game End**
```
1. After last question → Show final results
2. Save final scores to Firestore
3. Display podium animation
4. Option to play again or leave
```

## 💬 Chat System (Realtime Database)

### **Features:**
- Real-time message delivery (<100ms)
- System messages for game events
- User messages with username display
- Auto-scroll to bottom
- Message limit: 500 characters
- History limit: 100 messages (auto-cleanup)

### **Implementation:**
```typescript
// Send message
await rtdb.ref(`rooms/${roomId}/chat`).push({
  userId: currentUser.uid,
  username: currentUser.displayName,
  message: text,
  timestamp: rtdb.serverTimestamp(),
  type: 'user'
});

// Listen to messages
rtdb.ref(`rooms/${roomId}/chat`)
  .orderByChild('timestamp')
  .limitToLast(100)
  .on('child_added', (snapshot) => {
    const message = snapshot.val();
    addMessageToUI(message);
  });
```

## 🎨 UI/UX Design Principles

### **Responsive Layout:**
```
Desktop (>1024px):
┌─────────────────────────────────────────┐
│  Header (Room Code, Players, Timer)    │
├────────────┬────────────────────────────┤
│            │  Question Display Area     │
│   Chat     │  - Question text           │
│   Panel    │  - Answer options          │
│  (fixed    │  - Submit button           │
│   300px)   ├────────────────────────────┤
│            │  Leaderboard (live)        │
│            │  - Player avatars          │
│            │  - Scores                  │
└────────────┴────────────────────────────┘

Mobile (<768px):
┌────────────────────────────────┐
│  Header (compact)              │
├────────────────────────────────┤
│  Question Display              │
│  (full width)                  │
├────────────────────────────────┤
│  Leaderboard (collapsible)     │
├────────────────────────────────┤
│  [💬 Chat] (floating button)   │
└────────────────────────────────┘
```

### **Visual Feedback:**
- ✅ Green pulse when player answers
- ⏳ Yellow timer warning at 10s
- 🔴 Red flash when time's up
- 🎊 Confetti animation for correct answers
- 📊 Smooth score increment animations
- 🏆 Podium reveal animation at end

## 🔄 State Synchronization Strategy

### **Critical Timing Points:**
1. **Game Start**: All clients must start at same timestamp
2. **Question Display**: Synchronized via RTDB currentQuestion
3. **Timer**: Server-driven timer, clients display only
4. **Next Question**: Triggered when all answered OR timer=0
5. **Answer Reveal**: 3-second pause for explanation

### **Conflict Resolution:**
- Timer is SERVER source of truth (RTDB)
- Question number is SERVER controlled
- Answers are validated on submit (no changes after)
- Late joiners see current question state

## 🚀 Performance Optimizations

### **Firestore:**
- Batch writes for multiple operations
- Use subcollections to avoid large docs
- Index on status + createdAt for room listing
- Limit queries to 50 rooms max

### **Realtime Database:**
- Single listener per path
- Cleanup old chat messages (>100)
- Disconnect presence on tab close
- Debounce ready button clicks

### **Client-side:**
- Memoize player lists with React.memo
- Virtual scrolling for chat (>50 messages)
- Lazy load question images
- Preload next question while answering

## 🛡️ Security Rules

### **Firestore Rules:**
```javascript
// Only authenticated users can create rooms
allow create: if signedIn();

// Players can only modify their own player doc
allow update: if signedIn() && 
  request.auth.uid == playerId;

// Anyone in room can read
allow read: if signedIn() && 
  exists(/databases/$(database)/documents/
    multiplayer_rooms/$(roomId)/players/$(request.auth.uid));
```

### **Realtime Database Rules:**
```json
{
  "rooms": {
    "$roomId": {
      "chat": {
        "$messageId": {
          ".write": "auth != null && !data.exists()",
          ".validate": "newData.child('userId').val() == auth.uid"
        }
      },
      "presence": {
        "$userId": {
          ".write": "auth != null && auth.uid == $userId"
        }
      }
    }
  }
}
```

## 📱 Mobile Responsiveness

### **Breakpoints:**
- `xs`: 0-639px (Mobile portrait)
- `sm`: 640-767px (Mobile landscape)
- `md`: 768-1023px (Tablet)
- `lg`: 1024-1279px (Desktop)
- `xl`: 1280px+ (Large desktop)

### **Touch Optimizations:**
- Minimum tap target: 44x44px
- Swipe to close chat modal on mobile
- Pull-to-refresh room data
- Haptic feedback on answer submit (if supported)

## 🎵 Audio & Visual Polish

### **Sound Effects:**
- Tick sound every second (last 10s)
- Ding on correct answer
- Buzz on wrong answer
- Fanfare on game complete
- Notification sound for chat messages

### **Animations:**
- Fade in/out transitions (200ms)
- Slide animations for question changes (300ms)
- Scale pulse for score updates
- Shimmer loading states
- Skeleton screens while loading

## 🧪 Testing Checklist

- [ ] Create room with/without password
- [ ] Join room with correct/wrong password
- [ ] 2 players ready → auto countdown
- [ ] All players see same question at same time
- [ ] Timer syncs across all clients
- [ ] Answer submission before/after timer
- [ ] All players advance to next question together
- [ ] Chat messages appear for all players instantly
- [ ] Player disconnect → presence updates
- [ ] Player rejoin → restores state
- [ ] Mobile chat modal works smoothly
- [ ] Responsive design on all screen sizes
- [ ] Game completes correctly with final scores

