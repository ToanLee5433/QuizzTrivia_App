import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collect all keys from remaining files
const allKeys = {
  creatorManagement: {
    loadError: "Không thể tải danh sách creator",
    updateSuccess: "Đã cập nhật trạng thái thành công",
    updateError: "Có lỗi khi cập nhật trạng thái",
    deleteSuccess: "Đã xóa creator thành công",
    deleteError: "Có lỗi khi xóa creator",
    confirmDelete: "Bạn có chắc chắn muốn xóa creator này? Hành động này không thể hoàn tác.",
    loading: "Đang tải danh sách creator...",
    
    stats: {
      total: "Tổng Creator",
      active: "Đang hoạt động",
      banned: "Bị cấm"
    },
    
    status: {
      banned: "Bị cấm"
    },
    
    showing: "Hiển thị {{filtered}} trong tổng {{total}} creator"
  },
  
  quizReviews: {
    loadError: "Lỗi khi tải đánh giá",
    submitSuccess: "Đã gửi đánh giá thành công!",
    submitError: "Lỗi khi gửi đánh giá",
    deleteSuccess: "Đã xóa đánh giá",
    deleteError: "Lỗi khi xóa đánh giá",
    
    empty: {
      title: "Chưa có đánh giá nào",
      description: "Hãy là người đầu tiên đánh giá quiz này"
    },
    
    form: {
      rating: "Đánh giá của bạn",
      comment: "Nhận xét",
      commentPlaceholder: "Chia sẻ trải nghiệm của bạn về quiz này...",
      submit: "Gửi đánh giá",
      cancel: "Hủy"
    },
    
    confirmDelete: "Bạn có chắc muốn xóa đánh giá này?"
  },
  
  multiplayer: {
    roomCreated: "Đã tạo phòng thành công!",
    roomError: "Lỗi khi tạo phòng",
    joinSuccess: "Đã tham gia phòng!",
    joinError: "Lỗi khi tham gia phòng",
    leaveSuccess: "Đã rời phòng",
    waitingForPlayers: "Đang chờ người chơi khác...",
    gameStarting: "Game đang bắt đầu...",
    connecting: "Đang kết nối...",
    disconnected: "Mất kết nối với server"
  }
};

// Add keys to both VI and EN files
const localesDir = path.join(__dirname, '..', 'public', 'locales');

// Vietnamese
const viPath = path.join(localesDir, 'vi', 'common.json');
const viData = JSON.parse(fs.readFileSync(viPath, 'utf-8'));
Object.assign(viData, allKeys);
fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf-8');

// English
const enKeys = {
  creatorManagement: {
    loadError: "Unable to load creator list",
    updateSuccess: "Status updated successfully",
    updateError: "Error updating status",
    deleteSuccess: "Creator deleted successfully",
    deleteError: "Error deleting creator",
    confirmDelete: "Are you sure you want to delete this creator? This action cannot be undone.",
    loading: "Loading creator list...",
    
    stats: {
      total: "Total Creators",
      active: "Active",
      banned: "Banned"
    },
    
    status: {
      banned: "Banned"
    },
    
    showing: "Showing {{filtered}} of {{total}} creators"
  },
  
  quizReviews: {
    loadError: "Error loading reviews",
    submitSuccess: "Review submitted successfully!",
    submitError: "Error submitting review",
    deleteSuccess: "Review deleted",
    deleteError: "Error deleting review",
    
    empty: {
      title: "No reviews yet",
      description: "Be the first to review this quiz"
    },
    
    form: {
      rating: "Your Rating",
      comment: "Comment",
      commentPlaceholder: "Share your experience with this quiz...",
      submit: "Submit Review",
      cancel: "Cancel"
    },
    
    confirmDelete: "Are you sure you want to delete this review?"
  },
  
  multiplayer: {
    roomCreated: "Room created successfully!",
    roomError: "Error creating room",
    joinSuccess: "Joined room!",
    joinError: "Error joining room",
    leaveSuccess: "Left room",
    waitingForPlayers: "Waiting for other players...",
    gameStarting: "Game starting...",
    connecting: "Connecting...",
    disconnected: "Disconnected from server"
  }
};

const enPath = path.join(localesDir, 'en', 'common.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
Object.assign(enData, enKeys);
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf-8');

console.log('✅ Added remaining Files #6-10 translation keys!');
console.log('📦 Added:');
console.log('   - creatorManagement.*');
console.log('   - quizReviews.*');
console.log('   - multiplayer.*');
console.log('   Total: ~40 new keys with interpolation support');
