# 🎮 Multiplayer Feature - QuizTrivia App

## 📋 Tổng quan

Hệ thống Multiplayer hiện đại cho QuizTrivia App với các tính năng real-time, WebSocket integration và giao diện người dùng thân thiện.

## ✨ Tính năng chính

### 🏠 **Room Management**
- **Tạo phòng**: Tùy chỉnh cài đặt phòng (số người chơi, thời gian, quyền riêng tư)
- **Tham gia phòng**: Bằng mã phòng hoặc tìm phòng công khai
- **Phòng chờ**: Hiển thị danh sách người chơi, trạng thái sẵn sàng
- **Cài đặt phòng**: Host có thể điều chỉnh các thông số game

### 🎯 **Real-time Gameplay**
- **Đồng bộ thời gian thực**: Tất cả người chơi cùng làm câu hỏi
- **Timer đồng bộ**: Đếm ngược thời gian cho mỗi câu hỏi
- **Kết quả tức thì**: Hiển thị đáp án và điểm số ngay lập tức
- **Leaderboard**: Bảng xếp hạng cập nhật real-time

### 💬 **Chat System**
- **Chat real-time**: Giao tiếp với người chơi khác
- **System messages**: Thông báo hệ thống tự động
- **Typing indicators**: Hiển thị khi ai đó đang nhập tin nhắn
- **Message history**: Lưu trữ lịch sử chat trong phiên

### 🔌 **Connection Management**
- **Auto-reconnect**: Tự động kết nối lại khi mất mạng
- **Connection status**: Hiển thị trạng thái kết nối
- **Error handling**: Xử lý lỗi kết nối gracefully
- **Fallback mode**: Chế độ offline khi không có kết nối

## 🏗️ Kiến trúc hệ thống

### **Frontend Components**
```
src/features/multiplayer/
├── components/
│   ├── MultiplayerManager.tsx      # Component chính quản lý multiplayer
│   ├── GameModeSelector.tsx        # Chọn chế độ chơi (Single/Multiplayer)
│   ├── CreateRoomModal.tsx         # Modal tạo phòng
│   ├── JoinRoomModal.tsx           # Modal tham gia phòng
│   ├── RoomLobby.tsx               # Phòng chờ game
│   ├── MultiplayerQuiz.tsx         # Giao diện quiz multiplayer
│   ├── GameResults.tsx             # Hiển thị kết quả
│   └── MultiplayerChat.tsx         # Hệ thống chat
├── services/
│   └── enhancedMultiplayerService.ts  # Service quản lý WebSocket
└── types/
    └── index.ts                    # Type definitions
```

### **Backend Integration**
- **WebSocket Server**: Xử lý real-time communication
- **Room Management**: Quản lý phòng và người chơi
- **Game State**: Đồng bộ trạng thái game
- **Chat System**: Xử lý tin nhắn real-time

## 🚀 Cách sử dụng

### **1. Khởi tạo Multiplayer Service**
```typescript
import { getMultiplayerService } from './services/enhancedMultiplayerService';

const multiplayerService = getMultiplayerService();
await multiplayerService.connect(userId, userName);
```

### **2. Tạo phòng**
```typescript
const { room, player } = await multiplayerService.createRoom({
  name: 'My Quiz Room',
  maxPlayers: 6,
  isPrivate: false,
  settings: {
    timePerQuestion: 30,
    showAnswers: true,
    allowLateJoin: true,
    autoStart: false
  }
}, quizId);
```

### **3. Tham gia phòng**
```typescript
const { room, player } = await multiplayerService.joinRoom('ABC123', password);
```

### **4. Lắng nghe events**
```typescript
multiplayerService.on('room:update', (roomData) => {
  // Cập nhật UI khi phòng thay đổi
});

multiplayerService.on('game:start', (gameData) => {
  // Bắt đầu game
});

multiplayerService.on('chat:message', (message) => {
  // Nhận tin nhắn chat
});
```

## 🌐 Internationalization (i18n)

Hệ thống hỗ trợ đa ngôn ngữ với các key translation:

```typescript
// Vietnamese
"multiplayer": {
  "title": "Chơi cùng bạn bè",
  "createRoom": "Tạo phòng mới",
  "joinRoom": "Tham gia phòng",
  "lobby": {
    "title": "Phòng chờ",
    "waitingForHost": "Đang chờ chủ phòng bắt đầu"
  }
}

// English
"multiplayer": {
  "title": "Play with Friends",
  "createRoom": "Create New Room",
  "joinRoom": "Join Room",
  "lobby": {
    "title": "Game Lobby",
    "waitingForHost": "Waiting for host to start"
  }
}
```

## 🔧 Cấu hình

### **Environment Variables**
```env
# Development
REACT_APP_WS_URL=ws://localhost:8080/multiplayer

# Production
REACT_APP_WS_URL=wss://your-production-websocket-url.com/multiplayer
```

### **WebSocket Events**
```typescript
// Client to Server
'create_room' | 'join_room' | 'leave_room' | 'start_game' | 
'submit_answer' | 'chat_message' | 'kick_player' | 'update_status'

// Server to Client
'room_joined' | 'room_update' | 'player_joined' | 'player_left' |
'game_start' | 'question_start' | 'game_finish' | 'chat_message'
```

## 🎨 UI/UX Features

### **Modern Design**
- **Gradient backgrounds**: Tạo cảm giác hiện đại
- **Smooth animations**: Chuyển đổi mượt mà
- **Responsive design**: Tương thích mọi thiết bị
- **Dark/Light themes**: Hỗ trợ chế độ tối/sáng

### **User Experience**
- **Real-time feedback**: Phản hồi tức thì cho mọi hành động
- **Loading states**: Hiển thị trạng thái tải
- **Error handling**: Xử lý lỗi thân thiện
- **Accessibility**: Hỗ trợ người khuyết tật

## 🔒 Bảo mật

### **Authentication**
- **User verification**: Xác thực người dùng trước khi tham gia
- **Room permissions**: Kiểm soát quyền truy cập phòng
- **Rate limiting**: Giới hạn tần suất gửi tin nhắn

### **Data Protection**
- **Message encryption**: Mã hóa tin nhắn chat
- **Input validation**: Kiểm tra dữ liệu đầu vào
- **XSS prevention**: Ngăn chặn tấn công XSS

## 📊 Performance

### **Optimization**
- **Message batching**: Gộp nhiều tin nhắn thành một
- **Lazy loading**: Tải component khi cần
- **Memory management**: Quản lý bộ nhớ hiệu quả
- **Connection pooling**: Tối ưu kết nối WebSocket

### **Monitoring**
- **Connection metrics**: Theo dõi trạng thái kết nối
- **Performance tracking**: Đo lường hiệu suất
- **Error logging**: Ghi log lỗi chi tiết

## 🧪 Testing

### **Unit Tests**
```bash
npm run test:multiplayer
```

### **Integration Tests**
```bash
npm run test:integration
```

### **E2E Tests**
```bash
npm run test:e2e
```

## 🚀 Deployment

### **Build Process**
```bash
npm run build:multiplayer
```

### **Docker Support**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Roadmap

### **Phase 1 - Core Features** ✅
- [x] Room creation and joining
- [x] Real-time gameplay
- [x] Basic chat system
- [x] Connection management

### **Phase 2 - Advanced Features** 🚧
- [ ] Voice chat integration
- [ ] Screen sharing
- [ ] Custom avatars
- [ ] Tournament mode

### **Phase 3 - Social Features** 📋
- [ ] Friend system
- [ ] Team mode
- [ ] Achievements
- [ ] Leaderboards

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/your-repo/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Join our community](https://discord.gg/quiztrivia)

---

**Made with ❤️ by the QuizTrivia Team**
