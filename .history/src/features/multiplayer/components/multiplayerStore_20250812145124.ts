import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MultiplayerRoom, Player } from '../types';

interface MultiplayerState {
  currentRoom: MultiplayerRoom | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  gameStatus: 'idle' | 'waiting' | 'in-progress' | 'finished';
  currentPlayer: Player | null;
}

const initialState: MultiplayerState = {
  currentRoom: null,
  isConnected: false,
  isLoading: false,
  error: null,
  gameStatus: 'idle',
  currentPlayer: null,
};

const multiplayerSlice = createSlice({
  name: 'multiplayer',
  initialState,
  reducers: {
    setCurrentRoom: (state, action: PayloadAction<MultiplayerRoom | null>) => {
      state.currentRoom = action.payload;
      state.gameStatus = action.payload?.status || 'idle';
    },
    
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setGameStatus: (state, action: PayloadAction<'idle' | 'waiting' | 'in-progress' | 'finished'>) => {
      state.gameStatus = action.payload;
    },
    
    setCurrentPlayer: (state, action: PayloadAction<Player | null>) => {
      state.currentPlayer = action.payload;
    },
    
    updatePlayerInRoom: (state, action: PayloadAction<Player>) => {
      if (state.currentRoom) {
        const playerIndex = state.currentRoom.players.findIndex(p => p.id === action.payload.id);
        if (playerIndex !== -1) {
          state.currentRoom.players[playerIndex] = action.payload;
        }
      }
    },
    
    addPlayerToRoom: (state, action: PayloadAction<Player>) => {
      if (state.currentRoom) {
        const existingPlayer = state.currentRoom.players.find(p => p.id === action.payload.id);
        if (!existingPlayer) {
          state.currentRoom.players.push(action.payload);
        }
      }
    },
    
    removePlayerFromRoom: (state, action: PayloadAction<string>) => {
      if (state.currentRoom) {
        state.currentRoom.players = state.currentRoom.players.filter(p => p.id !== action.payload);
      }
    },
    
    resetMultiplayer: () => {
      return { ...initialState };
    },
  },
});

export const {
  setCurrentRoom,
  setConnected,
  setLoading,
  setError,
  setGameStatus,
  setCurrentPlayer,
  updatePlayerInRoom,
  addPlayerToRoom,
  removePlayerFromRoom,
  resetMultiplayer,
} = multiplayerSlice.actions;

export default multiplayerSlice.reducer;