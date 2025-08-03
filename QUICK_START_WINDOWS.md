# ðŸš€ Quick Start Guide - Advanced File Upload (Windows)

## 1. âœ… Check Installation
```powershell
node test-file-upload.js
```

## 2. ðŸ”‘ Setup AI Provider

### Option A: OpenAI (Recommended)
1. Get API key: https://platform.openai.com/api-keys
2. Copy .env.example to .env
3. Edit .env and add: VITE_OPENAI_API_KEY=your_key_here

### Option B: Local AI (Free)
```powershell
# Run as Administrator
.\setup-ollama.ps1
```

## 3. ðŸŽ¯ Usage
1. Start your development server: 
pm run dev
2. Go to Create Quiz page
3. Click "ðŸš€ AI Upload" button
4. Upload image/PDF/DOC/Excel file
5. Configure AI settings
6. Generate and review questions
7. Import to quiz

## 4. ðŸ“ Supported Files
- **Images**: JPG, PNG, GIF (OCR using Tesseract.js)
- **Documents**: PDF, DOC, DOCX, TXT
- **Spreadsheets**: CSV, XLSX, XLS

## 5. ðŸ”§ Windows-specific Setup

### PDF.js Configuration
Add to your ite.config.ts:
```typescript
export default defineConfig({
  // ... existing config
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  worker: {
    format: 'es'
  }
});
```

### Environment Variables
Copy .env.example to .env:
```powershell
Copy-Item .env.example .env
```

## 6. ðŸ› Troubleshooting

### Common Windows Issues:
1. **Node-gyp errors**: Install Visual Studio Build Tools
2. **Permission errors**: Run PowerShell as Administrator
3. **Path issues**: Use full paths for file operations
4. **Antivirus blocking**: Add project folder to exclusions

### Dependencies:
```powershell
# If installation fails, try:
npm cache clean --force
Remove-Item node_modules -Recurse -Force
npm install
```

## 7. ðŸ’¡ Windows Tips
- Use PowerShell (not Command Prompt) for better compatibility
- Enable Developer Mode in Windows Settings
- Use Windows Terminal for better experience
- Consider using WSL2 for Linux-like environment

## 8. ðŸš€ Performance
- Use SSD for faster file processing
- Close unnecessary applications during large file processing
- Monitor RAM usage with large PDF files
- Use Windows Task Manager to monitor resource usage
