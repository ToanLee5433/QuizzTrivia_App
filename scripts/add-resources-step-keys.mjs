import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newKeys = {
  resources: {
    title: "Tài liệu học tập",
    required: "Bắt buộc",
    recommended: "Khuyến nghị",
    addResource: "Thêm tài liệu",
    firstResource: "Thêm tài liệu đầu tiên",
    editResource: "Sửa tài liệu",
    newResource: "Thêm tài liệu mới",
    saveButton: "Thêm",
    updateButton: "Cập nhật",
    cancelButton: "Hủy",
    deleteButton: "Xóa",
    editButton: "Sửa",
    
    subtitle: "Thêm ít nhất 1 tài liệu (video, PDF, ảnh, hoặc link) để học viên xem trước khi làm bài",
    
    emptyState: {
      warning: "⚠️ Bắt buộc có ít nhất 1 tài liệu",
      description: "Tài liệu giúp học viên chuẩn bị tốt hơn trước khi làm bài.",
      cannotContinue: "Bạn không thể tiếp tục nếu chưa thêm tài liệu."
    },
    
    confirmDelete: "Bạn có chắc muốn xóa tài liệu này?",
    
    success: {
      deleted: "Đã xóa tài liệu",
      updated: "Đã cập nhật tài liệu",
      added: "Đã thêm tài liệu",
      imageUploaded: "✅ Upload ảnh thành công!",
      videoUploaded: "✅ Upload video thành công!",
      pdfUploaded: "✅ Upload pdf thành công!",
      audioUploaded: "✅ Upload audio thành công!"
    },
    
    errors: {
      fileTooLarge: "File quá lớn! Tối đa {{size}}MB cho {{type}}",
      invalidFormat: "❌ Định dạng file không hợp lệ cho {{type}}!",
      uploadFailed: "Upload thất bại",
      uploadError: "Lỗi upload: {{error}}",
      titleRequired: "Vui lòng nhập tiêu đề",
      urlRequired: "Vui lòng nhập URL hoặc upload file",
      videoOnly: "❌ Chỉ chấp nhận file video! (MP4, WebM, MOV, AVI)",
      pdfOnly: "❌ Chỉ chấp nhận file PDF!",
      audioOnly: "❌ Chỉ chấp nhận file audio! (MP3, WAV, OGG, M4A)",
      imageOnly: "❌ Chỉ chấp nhận file ảnh! (JPG, PNG, WebP, GIF)"
    },
    
    form: {
      typeLabel: "Loại tài liệu *",
      titleLabel: "Tiêu đề *",
      titlePlaceholder: "VD: Giới thiệu về React Hooks",
      descriptionLabel: "Mô tả",
      descriptionPlaceholder: "Mô tả ngắn gọn nội dung tài liệu...",
      
      urlLabel: {
        link: "URL (YouTube/Web) *",
        video: "Upload Video hoặc nhập URL *",
        pdf: "Upload PDF hoặc nhập URL *",
        audio: "Upload Audio hoặc nhập URL *",
        image: "Upload Ảnh hoặc nhập URL *"
      },
      
      urlPlaceholder: {
        link: "https://youtube.com/watch?v=... hoặc https://...",
        video: "https://example.com/video.mp4",
        pdf: "https://example.com/document.pdf",
        audio: "https://example.com/audio.mp3",
        image: "https://example.com/image.jpg"
      },
      
      linkHint: "💡 Hỗ trợ: YouTube, Google Drive, hoặc bất kỳ URL nào",
      
      acceptedFormats: {
        video: "✅ Chấp nhận: MP4, WebM, MOV, AVI (tối đa 50MB)",
        pdf: "✅ Chấp nhận: PDF (tối đa 10MB)",
        audio: "✅ Chấp nhận: MP3, WAV, OGG, M4A (tối đa 10MB)",
        image: "✅ Chấp nhận: JPG, PNG, WebP, GIF (tối đa 5MB)"
      },
      
      orDivider: "hoặc",
      uploading: "Đang upload...",
      urlReady: "✅ URL đã sẵn sàng",
      
      requiredLabel: "Bắt buộc xem",
      requiredDescription: "Học viên phải xem tài liệu này trước khi làm bài",
      
      whyWatchLabel: "💡 Vì sao nên xem? (gợi ý cho học viên)",
      whyWatchPlaceholder: "VD: Video này giúp bạn hiểu useState và useEffect",
      
      estimatedTimeLabel: "⏱️ Thời gian ước tính (phút)",
      estimatedTimePlaceholder: "10"
    },
    
    types: {
      video: "Video",
      pdf: "PDF",
      image: "Ảnh/Slide",
      audio: "Audio",
      link: "Link (YouTube/Web)",
      slides: "Slides"
    },
    
    estimatedTime: "⏱️ {{time}} phút",
    whyWatch: "💡 {{reason}}"
  }
};

// Add keys to both VI and EN files
const localesDir = path.join(__dirname, '..', 'public', 'locales');

// Vietnamese
const viPath = path.join(localesDir, 'vi', 'common.json');
const viData = JSON.parse(fs.readFileSync(viPath, 'utf-8'));
viData.resources = newKeys.resources;
fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf-8');

// English - Translate
const enKeys = {
  resources: {
    title: "Learning Resources",
    required: "Required",
    recommended: "Recommended",
    addResource: "Add Resource",
    firstResource: "Add First Resource",
    editResource: "Edit Resource",
    newResource: "Add New Resource",
    saveButton: "Add",
    updateButton: "Update",
    cancelButton: "Cancel",
    deleteButton: "Delete",
    editButton: "Edit",
    
    subtitle: "Add at least 1 resource (video, PDF, image, or link) for learners to view before taking the quiz",
    
    emptyState: {
      warning: "⚠️ At least 1 resource required",
      description: "Resources help learners prepare better before taking the quiz.",
      cannotContinue: "You cannot continue without adding a resource."
    },
    
    confirmDelete: "Are you sure you want to delete this resource?",
    
    success: {
      deleted: "Resource deleted",
      updated: "Resource updated",
      added: "Resource added",
      imageUploaded: "✅ Image uploaded successfully!",
      videoUploaded: "✅ Video uploaded successfully!",
      pdfUploaded: "✅ PDF uploaded successfully!",
      audioUploaded: "✅ Audio uploaded successfully!"
    },
    
    errors: {
      fileTooLarge: "File too large! Maximum {{size}}MB for {{type}}",
      invalidFormat: "❌ Invalid file format for {{type}}!",
      uploadFailed: "Upload failed",
      uploadError: "Upload error: {{error}}",
      titleRequired: "Please enter a title",
      urlRequired: "Please enter URL or upload file",
      videoOnly: "❌ Only video files accepted! (MP4, WebM, MOV, AVI)",
      pdfOnly: "❌ Only PDF files accepted!",
      audioOnly: "❌ Only audio files accepted! (MP3, WAV, OGG, M4A)",
      imageOnly: "❌ Only image files accepted! (JPG, PNG, WebP, GIF)"
    },
    
    form: {
      typeLabel: "Resource Type *",
      titleLabel: "Title *",
      titlePlaceholder: "E.g: Introduction to React Hooks",
      descriptionLabel: "Description",
      descriptionPlaceholder: "Brief description of the resource content...",
      
      urlLabel: {
        link: "URL (YouTube/Web) *",
        video: "Upload Video or enter URL *",
        pdf: "Upload PDF or enter URL *",
        audio: "Upload Audio or enter URL *",
        image: "Upload Image or enter URL *"
      },
      
      urlPlaceholder: {
        link: "https://youtube.com/watch?v=... or https://...",
        video: "https://example.com/video.mp4",
        pdf: "https://example.com/document.pdf",
        audio: "https://example.com/audio.mp3",
        image: "https://example.com/image.jpg"
      },
      
      linkHint: "💡 Supports: YouTube, Google Drive, or any URL",
      
      acceptedFormats: {
        video: "✅ Accepted: MP4, WebM, MOV, AVI (max 50MB)",
        pdf: "✅ Accepted: PDF (max 10MB)",
        audio: "✅ Accepted: MP3, WAV, OGG, M4A (max 10MB)",
        image: "✅ Accepted: JPG, PNG, WebP, GIF (max 5MB)"
      },
      
      orDivider: "or",
      uploading: "Uploading...",
      urlReady: "✅ URL ready",
      
      requiredLabel: "Required viewing",
      requiredDescription: "Learners must view this resource before taking the quiz",
      
      whyWatchLabel: "💡 Why watch? (hint for learners)",
      whyWatchPlaceholder: "E.g: This video helps you understand useState and useEffect",
      
      estimatedTimeLabel: "⏱️ Estimated time (minutes)",
      estimatedTimePlaceholder: "10"
    },
    
    types: {
      video: "Video",
      pdf: "PDF",
      image: "Image/Slide",
      audio: "Audio",
      link: "Link (YouTube/Web)",
      slides: "Slides"
    },
    
    estimatedTime: "⏱️ {{time}} minutes",
    whyWatch: "💡 {{reason}}"
  }
};

const enPath = path.join(localesDir, 'en', 'common.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
enData.resources = enKeys.resources;
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf-8');

console.log('✅ Added ResourcesStep translation keys!');
console.log('📦 Added resources.* keys with interpolation for {{size}}, {{type}}, {{time}}, {{reason}}, {{error}}');
