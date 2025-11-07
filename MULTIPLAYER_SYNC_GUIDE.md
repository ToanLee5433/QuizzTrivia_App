# Multiplayer Game Synchronization Guide

## Overview
This guide explains the synchronized multiplayer game system using Firebase Realtime Database (RTDB) for instant, sub-100ms synchronization across all players.

## Architecture

### Database Structure

```
rooms/
  {roomId}/
    presence/
      {userId}/
        isOnline: boolean
        username: string
        lastSeen: timestamp
    
    playerStatuses/
      {userId}/
        isReady: boolean
        updatedAt: timestamp
    
    countdown/
      remaining: number
      startedAt: timestamp
      isActive: boolean
    
    gameStatus/
      status: 'waiting' | 'starting' | 'playing' | 'finished'
      updatedAt: timestamp
    
    game/
      currentQuestion: number
      timer/
        startedAt: timestamp
        duration: number
        remaining: number
        isActive: boolean
      updatedAt: timestamp
    
    answerProgress/
      {questionIndex}/
        {userId}/
          hasAnswered: boolean
          timestamp: number
    
    chat/
      {messageId}/
        userId: string
        username: string
        message: string
        timestamp: number
        type: 'message' | 'system'
```

## Synchronization Flow

### 1. Room Lobby - Ready Countdown

**Location**: `RoomLobby.tsx`

**Flow**:
1. Players mark themselves ready using `updatePlayerStatus()`
2. When all players are ready, first player (alphabetically by ID) triggers countdown
3. Countdown broadcasts via RTDB to all clients
4. At countdown end, game transitions to 'playing' state

**Code Example**:
```typescript
// Listen to countdown
useEffect(() => {
  if (!state.roomId) return;
  
  const unsubscribe = realtimeService.listenToCountdown(state.roomId, (data) => {
    setCountdownData(data);
    
    if (data && data.isActive && data.remaining === 0) {
      // Start game when countdown reaches 0
      handleStartGame();
    }
  });
  
  return () => unsubscribe();
}, [state.roomId]);

// Trigger countdown (first player only)
useEffect(() => {
  if (!allReady || !state.roomId || countdownData) return;
  
  const players = Object.keys(state.roomData?.players || {}).sort();
  const isFirstPlayer = players[0] === currentUserId;
  
  if (isFirstPlayer) {
    realtimeService.startCountdown(state.roomId, 5);
  }
}, [allReady, state.roomId, countdownData, currentUserId]);
```

### 2. Game Timer Synchronization

**Location**: `MultiplayerQuiz.tsx` (to be implemented)

**Flow**:
1. Host starts question timer via `startQuestionTimer(roomId, duration)`
2. All clients listen to timer via `listenToTimer(roomId, callback)`
3. Timer calculates remaining time based on server timestamp (no drift)
4. When timer reaches 0, all clients advance to results simultaneously

**Code Example**:
```typescript
// Host starts timer when question begins
const startQuestionTimer = async (duration: number) => {
  if (!roomId || !isHost) return;
  await realtimeService.startQuestionTimer(roomId, duration);
};

// All clients listen to synchronized timer
useEffect(() => {
  if (!roomId) return;
  
  const unsubscribe = realtimeService.listenToTimer(roomId, (timerData) => {
    if (timerData) {
      setTimeRemaining(timerData.remaining);
      
      if (timerData.remaining === 0 && timerData.isActive) {
        // Time's up - show results
        handleTimeUp();
      }
    }
  });
  
  return () => unsubscribe();
}, [roomId]);
```

### 3. Question Progression

**Location**: `MultiplayerQuiz.tsx` (to be implemented)

**Flow**:
1. Host updates current question via `updateCurrentQuestion(roomId, index)`
2. All clients listen via `listenToCurrentQuestion(roomId, callback)`
3. When question changes, all clients:
   - Reset answer selection
   - Clear answer progress
   - Start new timer
   - Fetch new question data

**Code Example**:
```typescript
// Host advances to next question
const goToNextQuestion = async () => {
  if (!roomId || !isHost) return;
  
  const nextIndex = currentQuestionIndex + 1;
  await realtimeService.updateCurrentQuestion(roomId, nextIndex);
  await realtimeService.clearAnswerProgress(roomId, currentQuestionIndex);
  await realtimeService.startQuestionTimer(roomId, questionTimeLimit);
};

// All clients listen for question changes
useEffect(() => {
  if (!roomId) return;
  
  const unsubscribe = realtimeService.listenToCurrentQuestion(roomId, (index) => {
    setCurrentQuestionIndex(index);
    setSelectedAnswer(null);
    setShowResults(false);
  });
  
  return () => unsubscribe();
}, [roomId]);
```

### 4. Answer Progress Tracking

**Location**: `MultiplayerQuiz.tsx` (to be implemented)

**Flow**:
1. When player submits answer, mark via `markPlayerAnswered(roomId, userId, questionIndex)`
2. All clients listen via `listenToAnswerProgress(roomId, questionIndex, callback)`
3. Display real-time "X/Y players answered" indicator
4. Optionally show who has answered (without revealing their answer)

**Code Example**:
```typescript
// Mark player as answered when they submit
const handleAnswerSubmit = async (answerIndex: number) => {
  setSelectedAnswer(answerIndex);
  
  if (roomId) {
    await realtimeService.markPlayerAnswered(roomId, currentUserId, currentQuestionIndex);
    // Also submit answer to Firestore for scoring
    await submitAnswer(answerIndex);
  }
};

// Listen to answer progress
useEffect(() => {
  if (!roomId) return;
  
  const unsubscribe = realtimeService.listenToAnswerProgress(
    roomId, 
    currentQuestionIndex, 
    (count, answers) => {
      setAnsweredCount(count);
      setAnsweredPlayers(Object.keys(answers));
    }
  );
  
  return () => unsubscribe();
}, [roomId, currentQuestionIndex]);
```

## Race Condition Prevention

### First-Player Pattern

To avoid race conditions (multiple players triggering the same action), use the **first-player-alphabetically** pattern:

```typescript
const players = Object.keys(roomData.players || {}).sort();
const isFirstPlayer = players[0] === currentUserId;

if (isFirstPlayer) {
  // Only first player triggers server actions
  await realtimeService.startCountdown(roomId, 5);
}
```

**Why this works**:
- All clients have same player list
- Sorting is deterministic
- Only one player executes the action
- No server-side coordination needed

## Client vs Server Authority

### Client-Authoritative (Fast)
✅ **Use for UI state**:
- Selected answer highlight
- Animation triggers
- Sound effects
- Loading spinners

### Server-Authoritative (Accurate)
✅ **Use for game state**:
- Question progression
- Timer countdown
- Answer scoring
- Game status transitions

### Hybrid Approach
The system uses **optimistic updates**:
1. Client shows immediate feedback (e.g., answer selection)
2. Server validates and broadcasts truth
3. Client reconciles if mismatch

## Performance Optimizations

### 1. Debounce Rapid Updates
```typescript
const debouncedUpdate = useCallback(
  debounce((value) => realtimeService.updateSomething(value), 300),
  []
);
```

### 2. Cleanup Listeners
Always clean up RTDB listeners to prevent memory leaks:
```typescript
useEffect(() => {
  const unsubscribe = realtimeService.listenToTimer(roomId, callback);
  return () => unsubscribe(); // Critical!
}, [roomId]);
```

### 3. Batch Reads
Use `onValue()` for continuous sync instead of multiple `get()` calls.

### 4. Limit Listener Scope
Listen only to specific paths:
- ❌ `rooms/${roomId}` (entire room)
- ✅ `rooms/${roomId}/game/timer` (just timer)

## Testing Synchronization

### Multi-Device Testing
1. Open game in 2+ browser windows (incognito for different users)
2. Start countdown - verify all see same countdown
3. Advance question - verify all move together
4. Submit answers - verify progress updates instantly

### Latency Simulation
Use Chrome DevTools Network throttling:
1. Open DevTools > Network tab
2. Select "Fast 3G" or "Slow 3G"
3. Verify game remains synchronized despite lag

### Edge Cases
- Player disconnects mid-countdown
- Timer expires while player is submitting
- All players leave room
- Network reconnection after offline period

## Troubleshooting

### Problem: Players see different countdowns
**Solution**: Ensure all clients calculate from server timestamp:
```typescript
const elapsed = Math.floor((Date.now() - data.startedAt) / 1000);
const remaining = Math.max(0, data.duration - elapsed);
```

### Problem: Timer drift over time
**Solution**: Use server timestamp as source of truth, not client intervals:
```typescript
// ❌ Bad: Client-side interval
setInterval(() => setTime(time - 1), 1000);

// ✅ Good: Server timestamp
const elapsed = (Date.now() - startedAt) / 1000;
```

### Problem: Multiple countdown triggers
**Solution**: Use first-player pattern + check if countdown already active:
```typescript
if (isFirstPlayer && !countdownData) {
  realtimeService.startCountdown(roomId, 5);
}
```

### Problem: PERMISSION_DENIED errors
**Solution**: Verify RTDB paths match database.rules.json schema:
- `isOnline` (boolean) - not `online`
- `username` (string) - not `name`
- `playerStatuses/{userId}` - not `players/{userId}/status`

## Next Steps

### Immediate Implementation
1. ✅ Fix RoomLobby UI to use `countdownData?.remaining`
2. 🔄 Add timer sync to MultiplayerQuiz
3. 🔄 Add question progression sync
4. 🔄 Add answer progress tracking

### Advanced Features
- Show who has answered (avatars/names)
- Animated progress bars
- Sound effects on timer milestones
- Celebration animations for correct answers
- Leaderboard updates in real-time

### Performance Monitoring
- Track RTDB latency with timestamps
- Log sync delays (server time vs client time)
- Alert if drift > 500ms

## References

- **Database Rules**: `database.rules.json`
- **Service Layer**: `src/features/multiplayer/services/realtimeMultiplayerService.ts`
- **Room Lobby**: `src/features/multiplayer/components/RoomLobby.tsx`
- **Game Component**: `src/features/multiplayer/components/MultiplayerQuiz.tsx`
- **Firebase RTDB Docs**: https://firebase.google.com/docs/database
