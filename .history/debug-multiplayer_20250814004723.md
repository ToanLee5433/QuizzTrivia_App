# Multiplayer Debug Log

## Expected Flow:
1. User goes to /multiplayer
2. MultiplayerPage creates fallback quiz with 3 questions
3. User creates room - should see selectedQuiz data in console
4. Game starts - should load questions from selectedQuiz
5. User sees questions in MultiplayerQuiz component

## Debug Steps:
1. Check browser console for quiz data logs
2. Create room and check room creation logs
3. Start game and check game start logs
4. Check if questions are loaded in MultiplayerQuiz

## Key Debug Logs to Look For:
- `🎮 MultiplayerPage Quiz Data:` - Should show fallback quiz
- `🏗️ Creating room with config:` - Should show selectedQuiz
- `🔍 Loading quiz data:` - Should show quiz loading process
- `🎮 Emitting game:start with data:` - Should show questions being emitted
- `🎮 Game Start Event Received:` - Should show gameData in MultiplayerManager
- `🎮 MultiplayerQuiz Debug:` - Should show questions in component

## Current Issue:
Questions not loading after countdown → likely gameData not properly passed to MultiplayerQuiz
