import fs from 'fs';
import path from 'path';

const viPath = './public/locales/vi/common.json';
const enPath = './public/locales/en/common.json';

// Read existing files
const viData = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Add ImageUploader keys
viData.imageUploader = {
  uploading: "⚡ Đang upload siêu nhanh (1-3s)...",
  uploadFast: "✅ Upload nhanh như chớp!",
  thumbnailsReady: "🖼️ Thumbnails đã sẵn sàng",
  uploadError: "Có lỗi xảy ra",
  selectImageFirst: "Vui lòng chọn ảnh trước",
  compressing: "Đang nén ảnh...",
  uploadSuccess: "Upload ảnh thành công! ✨",
  thumbnailsGenerated: "Thumbnails đã được tạo tự động",
  uploadErrorDetailed: "Có lỗi xảy ra khi upload",
  selectImageFile: "Vui lòng chọn file ảnh"
};

enData.imageUploader = {
  uploading: "⚡ Uploading super fast (1-3s)...",
  uploadFast: "✅ Upload lightning fast!",
  thumbnailsReady: "🖼️ Thumbnails are ready",
  uploadError: "An error occurred",
  selectImageFirst: "Please select an image first",
  compressing: "Compressing image...",
  uploadSuccess: "Image uploaded successfully! ✨",
  thumbnailsGenerated: "Thumbnails generated automatically",
  uploadErrorDetailed: "An error occurred during upload",
  selectImageFile: "Please select an image file"
};

// Write back
fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');

console.log('✅ Added ImageUploader translation keys!');
