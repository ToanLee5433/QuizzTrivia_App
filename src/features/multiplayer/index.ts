// Export main page
export { default as MultiplayerPage } from './pages/MultiplayerPage';

// Export new multiplayer components
import GameModeSelector from './components/GameModeSelector';
export { GameModeSelector };

import CreateRoomModal from './components/CreateRoomModal';
export { CreateRoomModal };

import JoinRoomModal from './components/JoinRoomModal';
export { JoinRoomModal };

import RoomLobby from './components/RoomLobby';
export { RoomLobby };

import MultiplayerQuiz from './components/MultiplayerQuiz';
export { MultiplayerQuiz };

import MultiplayerManager from './components/MultiplayerManager';
export { MultiplayerManager };

// Export services
export { firestoreMultiplayerService } from './services/firestoreMultiplayerService';
export { getMultiplayerService } from './services/enhancedMultiplayerService';