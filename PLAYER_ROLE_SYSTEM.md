# Hệ Thống Vai Trò Người Chơi (Player Role System)

## Tổng Quan

Đã implement hệ thống vai trò để phân biệt rõ ràng giữa Host, Người chơi và Người xem trong multiplayer.

## 3 Vai Trò

### 1. **Host** (`role: 'host'`)
- Người tạo phòng, có quyền quản lý
- **Đặc biệt**: Host có thể chuyển đổi giữa 2 chế độ:
  - 🎮 **Chơi** (`isParticipating: true`): Tham gia game như người chơi bình thường
  - 👁️ **Xem** (`isParticipating: false`): Chỉ theo dõi, không tham gia game
- Có thể chuyển host cho người khác (sẽ trở thành player thông thường)
- Có thể kick người chơi
- Không cần đánh dấu sẵn sàng khi ở chế độ xem

### 2. **Player** (`role: 'player'`)
- Người chơi thông thường
- Phải đánh dấu "Sẵn sàng" trước khi bắt đầu game
- Tham gia tính điểm và leaderboard
- Có thể trở thành spectator nếu muốn

### 3. **Spectator** (`role: 'spectator'`)
- Người xem, không tham gia chơi
- Không cần sẵn sàng
- Không tính vào số người chơi tối thiểu để bắt đầu game
- Có thể chuyển lại thành player

## UI Components

### MemoizedPlayerCard
- Hiển thị badge vai trò:
  - "Người xem" cho spectator
  - "Đang xem" cho host đang ở chế độ spectator
- Nút toggle cho host: "🎮 Chơi" / "👁️ Xem"
- Nút "Sẵn sàng" chỉ hiện cho player (không phải host và spectator)
- Ready status chỉ hiển thị cho người đang tham gia chơi

### ModernRoomLobby
- **Active Players**: Người thực sự tham gia (không bao gồm spectators và host đang xem)
- **Total Players**: Tất cả mọi người trong phòng
- Hiển thị: "X chơi, Y xem"
- Ready count: chỉ đếm active players

## Service Methods

### `toggleHostParticipation()`
```typescript
// Host chuyển đổi giữa chơi và xem
await modernMultiplayerService.toggleHostParticipation();
```

### `toggleRole()`
```typescript
// Player/Spectator chuyển đổi vai trò
await modernMultiplayerService.toggleRole();
```

### `transferHost(newHostId: string)`
```typescript
// Chuyển host, cập nhật role:
// - Old host → player
// - New host → host
await modernMultiplayerService.transferHost(playerId);
```

## Game Start Logic

Game có thể bắt đầu khi:
- Có ít nhất 2 **active players** (người thực sự chơi)
- Ít nhất 1 người chơi không phải host đã sẵn sàng
- Spectators và host đang xem KHÔNG tính vào số người chơi

```typescript
const activePlayers = playersList.filter(p => {
  if (p.role === 'spectator') return false;
  if (p.role === 'host') return p.isParticipating !== false;
  return true;
});

const canStart = activePlayers.length >= 2 && 
                 nonHostActivePlayers.some(p => p.isReady);
```

## Database Structure

### RTDB Player Object
```typescript
{
  id: string,
  name: string,
  score: number,
  isReady: boolean,
  isOnline: boolean,
  role: 'host' | 'player' | 'spectator',
  isParticipating?: boolean, // Chỉ cho host
  joinedAt: number,
  lastActive: number,
  answers: []
}
```

## Lợi Ích

✅ Host không cần nhượng quyền để tham gia chơi
✅ Phân biệt rõ người chơi và người xem
✅ Linh hoạt: host có thể chuyển đổi giữa chơi/xem bất cứ lúc nào
✅ Logic game start chính xác: chỉ đếm người thực sự chơi
✅ UI rõ ràng với badges và buttons phù hợp từng vai trò

## Migration Notes

Khi deploy, các player hiện tại sẽ:
- Host: `role = 'host'`, `isParticipating = true`
- Players: `role = 'player'`
- Code tự động set role khi join/create room
