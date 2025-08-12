import { 
  Room, 
  Player, 
  RoomConfig, 
  Quiz,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomListResponse,
  SocketEvents
} from '../types';

export interface MultiplayerServiceInterface {
  // Connection management
  connect(userId: string, userName: string): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Room management
  createRoom(config: RoomConfig, quiz: Quiz): Promise<CreateRoomResponse>;
  joinRoom(roomId: string, password?: string): Promise<JoinRoomResponse>;
  leaveRoom(roomId: string): Promise<void>;
  getRoomList(page?: number, pageSize?: number): Promise<RoomListResponse>;
  getRoomDetails(roomId: string): Promise<Room>;
  
  // Game management
  startGame(roomId: string): Promise<void>;
  submitAnswer(questionId: string, answer: string, timeRemaining: number): Promise<void>;
  setPlayerReady(roomId: string, isReady: boolean): Promise<void>;
  
  // Chat
  sendChatMessage(roomId: string, message: string): Promise<void>;
  
  // Admin actions (host only)
  kickPlayer(roomId: string, playerId: string): Promise<void>;
  updateRoomSettings(roomId: string, settings: Partial<RoomConfig>): Promise<void>;
  
  // Event listeners
  on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void;
  off<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void;
}

class EnhancedMultiplayerService implements MultiplayerServiceInterface {
  private socket: WebSocket | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(userId: string, userName: string): Promise<void> {
    this.userId = userId;
    this.userName = userName;
    
    return new Promise((resolve, reject) => {
      try {
        // Use your WebSocket server URL here
        const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';
        this.socket = new WebSocket(`${wsUrl}?userId=${userId}&userName=${encodeURIComponent(userName)}`);
        
        this.socket.onopen = () => {
          console.log('Connected to multiplayer server');
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        this.socket.onclose = () => {
          console.log('Disconnected from multiplayer server');
          this.handleReconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.userId = null;
    this.userName = null;
    this.eventListeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private handleMessage(data: any): void {
    const { type, payload } = data;
    
    if (this.eventListeners.has(type)) {
      const listeners = this.eventListeners.get(type)!;
      listeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.userId && this.userName) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(this.userId!, this.userName!).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private sendRequest(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to server'));
        return;
      }
      
      const messageId = Math.random().toString(36).substr(2, 9);
      const message = {
        id: messageId,
        type,
        payload
      };
      
      // Set up one-time response listener
      const responseHandler = (data: any) => {
        if (data.requestId === messageId) {
          this.off('response', responseHandler as any);
          if (data.success) {
            resolve(data.payload);
          } else {
            reject(new Error(data.error || 'Request failed'));
          }
        }
      };
      
      this.on('response', responseHandler as any);
      
      this.socket!.send(JSON.stringify(message));
      
      // Timeout after 10 seconds
      setTimeout(() => {
        this.off('response', responseHandler as any);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }

  async createRoom(config: RoomConfig, quiz: Quiz): Promise<CreateRoomResponse> {
    return this.sendRequest('room:create', { config, quiz });
  }

  async joinRoom(roomId: string, password?: string): Promise<JoinRoomResponse> {
    return this.sendRequest('room:join', { roomId, password });
  }

  async leaveRoom(roomId: string): Promise<void> {
    return this.sendRequest('room:leave', { roomId });
  }

  async getRoomList(page = 1, pageSize = 20): Promise<RoomListResponse> {
    return this.sendRequest('room:list', { page, pageSize });
  }

  async getRoomDetails(roomId: string): Promise<Room> {
    return this.sendRequest('room:details', { roomId });
  }

  async startGame(roomId: string): Promise<void> {
    return this.sendRequest('game:start', { roomId });
  }

  async submitAnswer(questionId: string, answer: string, timeRemaining: number): Promise<void> {
    return this.sendRequest('game:answer', { questionId, answer, timeRemaining });
  }

  async setPlayerReady(roomId: string, isReady: boolean): Promise<void> {
    return this.sendRequest('player:ready', { roomId, isReady });
  }

  async sendChatMessage(roomId: string, message: string): Promise<void> {
    return this.sendRequest('chat:send', { roomId, message });
  }

  async kickPlayer(roomId: string, playerId: string): Promise<void> {
    return this.sendRequest('player:kick', { roomId, playerId });
  }

  async updateRoomSettings(roomId: string, settings: Partial<RoomConfig>): Promise<void> {
    return this.sendRequest('room:update', { roomId, settings });
  }

  on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void {
    const eventStr = event as string;
    if (!this.eventListeners.has(eventStr)) {
      this.eventListeners.set(eventStr, new Set());
    }
    this.eventListeners.get(eventStr)!.add(callback);
  }

  off<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void {
    const eventStr = event as string;
    if (this.eventListeners.has(eventStr)) {
      this.eventListeners.get(eventStr)!.delete(callback);
    }
  }
}

// Singleton instance
export const multiplayerService = new EnhancedMultiplayerService();

// Mock service for development/testing
export class MockMultiplayerService implements MultiplayerServiceInterface {
  private connected = false;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private mockRooms: Room[] = [
    {
      id: 'room-1',
      code: 'ABC123',
      name: 'Friday Quiz Night',
      hostId: 'user-1',
      hostName: 'QuizMaster_John',
      isPrivate: false,
      maxPlayers: 6,
      currentPlayers: 3,
      timePerQuestion: 30,
      allowLateJoin: true,
      showCorrectAnswers: true,
      status: 'waiting',
      quizId: 'quiz-1',
      quizTitle: 'General Knowledge Challenge',
      quizCategory: 'Mixed',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  async connect(userId: string, userName: string): Promise<void> {
    this.connected = true;
    console.log('Mock multiplayer service connected');
  }

  disconnect(): void {
    this.connected = false;
    this.eventListeners.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async createRoom(config: RoomConfig, quiz: Quiz): Promise<CreateRoomResponse> {
    const room: Room = {
      id: Math.random().toString(36).substr(2, 9),
      code: Math.random().toString(36).substr(2, 6).toUpperCase(),
      name: config.roomName,
      hostId: 'current-user',
      hostName: 'Current User',
      isPrivate: config.isPrivate,
      maxPlayers: config.maxPlayers,
      currentPlayers: 1,
      timePerQuestion: config.timeLimit,
      allowLateJoin: config.allowLateJoin,
      showCorrectAnswers: config.showCorrectAnswers,
      status: 'waiting',
      quizId: quiz.id,
      quizTitle: quiz.title,
      quizCategory: quiz.category,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const player: Player = {
      id: 'current-user',
      name: 'Current User',
      score: 0,
      streak: 0,
      hasAnswered: false,
      isReady: false,
      isHost: true,
      joinedAt: new Date()
    };

    this.mockRooms.push(room);
    return { room, player, success: true };
  }

  async joinRoom(roomId: string, password?: string): Promise<JoinRoomResponse> {
    const room = this.mockRooms.find(r => r.id === roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const players: Player[] = [
      {
        id: room.hostId,
        name: room.hostName,
        score: 0,
        streak: 0,
        hasAnswered: false,
        isReady: true,
        isHost: true,
        joinedAt: new Date()
      },
      {
        id: 'current-user',
        name: 'Current User',
        score: 0,
        streak: 0,
        hasAnswered: false,
        isReady: false,
        isHost: false,
        joinedAt: new Date()
      }
    ];

    const player = players[1];
    room.currentPlayers = players.length;

    return { room, players, player, success: true };
  }

  async leaveRoom(roomId: string): Promise<void> {
    // Mock implementation
  }

  async getRoomList(page = 1, pageSize = 20): Promise<RoomListResponse> {
    return {
      rooms: this.mockRooms.filter(r => r.status === 'waiting'),
      total: this.mockRooms.length,
      page,
      pageSize
    };
  }

  async getRoomDetails(roomId: string): Promise<Room> {
    const room = this.mockRooms.find(r => r.id === roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    return room;
  }

  async startGame(roomId: string): Promise<void> {
    // Mock implementation
  }

  async submitAnswer(questionId: string, answer: string, timeRemaining: number): Promise<void> {
    // Mock implementation
  }

  async setPlayerReady(roomId: string, isReady: boolean): Promise<void> {
    // Mock implementation
  }

  async sendMessage(roomId: string, message: string): Promise<void> {
    // Mock implementation
  }

  async kickPlayer(roomId: string, playerId: string): Promise<void> {
    // Mock implementation
  }

  async updateRoomSettings(roomId: string, settings: Partial<RoomConfig>): Promise<void> {
    // Mock implementation
  }

  on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void {
    const eventStr = event as string;
    if (!this.eventListeners.has(eventStr)) {
      this.eventListeners.set(eventStr, new Set());
    }
    this.eventListeners.get(eventStr)!.add(callback);
  }

  off<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void {
    const eventStr = event as string;
    if (this.eventListeners.has(eventStr)) {
      this.eventListeners.get(eventStr)!.delete(callback);
    }
  }
}

// Export the service to use
export const getMultiplayerService = (): MultiplayerServiceInterface => {
  // Use mock service in development
  if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_WS_URL) {
    return new MockMultiplayerService();
  }
  return multiplayerService;
};
