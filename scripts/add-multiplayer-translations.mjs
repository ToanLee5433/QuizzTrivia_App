import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// New translation keys to add
const newKeys = {
  vi: {
    multiplayer: {
      sound: {
        title: "Âm thanh",
        volume: "Âm lượng",
        enableSound: "Bật âm thanh",
        disableSound: "Tắt âm thanh"
      },
      timer: {
        seconds: "giây",
        timeUp: "Hết giờ!"
      },
      host: {
        hostControl: "Điều Khiển Host",
        questionProgress: "Câu {{current}}/{{total}}",
        answersReceived: "Đã nhận câu trả lời",
        pause: "Tạm dừng",
        resume: "Tiếp tục",
        skipQuestion: "Bỏ qua câu này",
        endGame: "Kết thúc game",
        confirmEndGame: "Bạn có chắc muốn kết thúc game sớm?"
      },
      results: {
        correct: "CHÍNH XÁC!",
        wrong: "SAI RỒI!",
        points: "điểm",
        explanation: "Giải thích",
        rankUp: "Tăng {{count}} hạng! ⬆️",
        rankDown: "Giảm {{count}} hạng ⬇️"
      }
    }
  },
  en: {
    multiplayer: {
      sound: {
        title: "Sound",
        volume: "Volume",
        enableSound: "Enable Sound",
        disableSound: "Disable Sound"
      },
      timer: {
        seconds: "seconds",
        timeUp: "Time's up!"
      },
      host: {
        hostControl: "Host Control",
        questionProgress: "Question {{current}}/{{total}}",
        answersReceived: "Answers Received",
        pause: "Pause",
        resume: "Resume",
        skipQuestion: "Skip Question",
        endGame: "End Game",
        confirmEndGame: "Are you sure you want to end the game early?"
      },
      results: {
        correct: "CORRECT!",
        wrong: "WRONG!",
        points: "points",
        explanation: "Explanation",
        rankUp: "Rank up {{count}}! ⬆️",
        rankDown: "Rank down {{count}} ⬇️"
      }
    }
  }
};

// Function to deep merge objects
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

// Update translation files
['vi', 'en'].forEach(lang => {
  const filePath = path.join(__dirname, '../public/locales', lang, 'common.json');
  
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Merge new keys
    deepMerge(content, newKeys[lang]);
    
    // Write back
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
    
    console.log(`✅ Updated ${lang}/common.json with new multiplayer keys`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/common.json:`, error.message);
  }
});

console.log('\n🎉 Translation keys added successfully!');
