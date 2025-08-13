#!/usr/bin/env node

import fs from 'fs-extra';

// Additional missing keys for multiplayer game modes and features
const additionalKeys = {
  vi: {
    "multiplayer": {
      "avgScore": "Điểm trung bình",
      "backToLobby": "Quay lại phòng chờ",
      "chat": {
        "disabled": "Chat đã tắt",
        "noMessages": "Chưa có tin nhắn nào",
        "placeholder": "Nhập tin nhắn...",
        "title": "Chat"
      },
      "createRoomDesc": "Tạo phòng mới với quiz của bạn",
      "easySetupDesc": "Tạo phòng đơn giản, chia sẻ mã tham gia",
      "enterPassword": "Nhập mật khẩu...",
      "enterRoomCode": "Nhập mã phòng...",
      "enterRoomName": "Nhập tên phòng...",
      "errors": {
        "connectionFailed": "Kết nối thất bại",
        "connectionLost": "Mất kết nối",
        "gameInProgress": "Game đang diễn ra",
        "reconnecting": "Đang kết nối lại",
        "roomFull": "Phòng đã đầy",
        "roomNotFound": "Không tìm thấy phòng",
        "wrongPassword": "Mật khẩu không đúng"
      },
      "features": "Tính năng Multiplayer",
      "game": {
        "finalResults": "Kết quả cuối cùng",
        "gameOver": "Game kết thúc"
      },
      "guideDesc": "Tìm hiểu cách chơi multiplayer",
      "joinRoomDesc": "Tham gia phòng có sẵn hoặc nhập mã phòng",
      "leaderboardDesc": "Bảng xếp hạng trực tiếp, cạnh tranh điểm số",
      "maxPlayers": "Số người tối đa",
      "password": "Mật khẩu",
      "passwordRequired": "Phòng này yêu cầu mật khẩu",
      "playAgain": "Chơi lại",
      "private": "Phòng riêng tư",
      "quickScoringDesc": "Điểm cao hơn khi trả lời nhanh và chính xác",
      "readyPlayers": "Đã sẵn sàng",
      "realTimeDesc": "Chơi cùng lúc với bạn bè, đồng bộ thời gian thực",
      "roomCodeHint": "Mã phòng gồm 6 ký tự",
      "roomName": "Tên phòng",
      "roomSettings": "Cài đặt phòng",
      "showLeaderboard": "Hiển thị bảng xếp hạng",
      "startingIn": "Bắt đầu trong",
      "subtitle": "Tham gia phòng và thi đấu với người khác",
      "success": {
        "connectionRestored": "Kết nối đã được khôi phục",
        "gameStarted": "Game đã bắt đầu",
        "joinedRoom": "Tham gia phòng thành công",
        "leftRoom": "Đã rời phòng",
        "roomCreated": "Tạo phòng thành công"
      },
      "timeLimit": "Thời gian mỗi câu",
      "timePerQuestion": "Thời gian/câu",
      "totalPlayers": "Tổng người chơi",
      "totalQuestions": "Tổng số câu hỏi",
      "totalTime": "Tổng thời gian",
      "waitingForPlayer": "Chờ người chơi...",
      "yourResult": "Kết quả của bạn"
    },
    "gameMode": {
      "becomeHost": "Trở thành chủ phòng",
      "createRoom": "Tạo phòng",
      "createRoomDesc": "Bắt đầu game mới và mời bạn bè",
      "customizable": "Tùy chỉnh cài đặt",
      "customizeSettings": "Tùy chỉnh cài đặt game",
      "invitePlayers": "Mời tối đa 10 người chơi",
      "multiplayer": "Chơi nhiều người",
      "multiplayerDesc": "Thách thức bạn bè và thi đấu thời gian thực",
      "noPressure": "Không áp lực thời gian",
      "singlePlayer": "Chơi một mình",
      "singlePlayerDesc": "Luyện tập theo tốc độ riêng và nâng cao kỹ năng",
      "startSolo": "Bắt đầu chơi",
      "trackProgress": "Theo dõi tiến độ"
    }
  },
  en: {
    "multiplayer": {
      "avgScore": "Average Score",
      "backToLobby": "Back to Lobby",
      "game": {
        "finalResults": "Final Results",
        "gameOver": "Game Over"
      },
      "playAgain": "Play Again",
      "totalQuestions": "Total Questions",
      "totalTime": "Total Time",
      "yourResult": "Your Result"
    }
  }
};

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

async function addAdditionalKeys() {
  console.log('🔧 Adding additional multiplayer keys...');
  
  // Process Vietnamese
  console.log('📝 Processing Vietnamese locale...');
  const viPath = './public/locales/vi/common.json';
  const viData = await fs.readJSON(viPath);
  const viMerged = deepMerge(viData, additionalKeys.vi);
  await fs.writeJSON(viPath, viMerged, { spaces: 2 });
  
  // Process English
  console.log('📝 Processing English locale...');
  const enPath = './public/locales/en/common.json';
  const enData = await fs.readJSON(enPath);
  const enMerged = deepMerge(enData, additionalKeys.en);
  await fs.writeJSON(enPath, enMerged, { spaces: 2 });
  
  console.log('✅ Additional multiplayer keys added successfully!');
}

addAdditionalKeys().catch(console.error);
