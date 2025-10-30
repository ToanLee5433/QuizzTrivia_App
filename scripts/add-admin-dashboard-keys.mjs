import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newKeys = {
  admin: {
    userStatus: {
      active: "Hoạt động",
      blocked: "Bị khóa",
      lockButton: "Khóa",
      unlockButton: "Mở khóa"
    },
    confirmations: {
      lockUser: "Bạn có chắc chắn muốn khóa tài khoản này?",
      unlockUser: "Bạn có chắc chắn muốn mở khóa tài khoản này?",
      deleteUser: "Bạn có chắc chắn muốn xóa người dùng này?"
    }
  }
};

// Add keys to both VI and EN files
const localesDir = path.join(__dirname, '..', 'public', 'locales');

// Vietnamese
const viPath = path.join(localesDir, 'vi', 'common.json');
const viData = JSON.parse(fs.readFileSync(viPath, 'utf-8'));
if (!viData.admin) viData.admin = {};
viData.admin.userStatus = newKeys.admin.userStatus;
viData.admin.confirmations = newKeys.admin.confirmations;
fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf-8');

// English
const enKeys = {
  admin: {
    userStatus: {
      active: "Active",
      blocked: "Blocked",
      lockButton: "Lock",
      unlockButton: "Unlock"
    },
    confirmations: {
      lockUser: "Are you sure you want to lock this account?",
      unlockUser: "Are you sure you want to unlock this account?",
      deleteUser: "Are you sure you want to delete this user?"
    }
  }
};

const enPath = path.join(localesDir, 'en', 'common.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
if (!enData.admin) enData.admin = {};
enData.admin.userStatus = enKeys.admin.userStatus;
enData.admin.confirmations = enKeys.admin.confirmations;
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf-8');

console.log('✅ Added AdminDashboard user status translation keys!');
console.log('📦 Added admin.userStatus.* and admin.confirmations.*');
