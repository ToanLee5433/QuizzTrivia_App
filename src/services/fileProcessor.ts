// File processing utilities for different file types
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FileProcessingResult {
  content: string;
  type: 'text' | 'image' | 'document';
  error?: string;
}

export class FileProcessor {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async processFile(file: File): Promise<FileProcessingResult> {
    const fileType = this.getFileType(file);
    
    switch (fileType) {
      case 'image':
        return this.processImage(file);
      case 'pdf':
        return this.processPDF(file);
      case 'doc':
        return this.processDocument(file);
      case 'text':
        return this.processTextFile(file);
      default:
        return {
          content: '',
          type: 'text',
          error: `Loại file không được hỗ trợ: ${file.type}`
        };
    }
  }

  private getFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
    if (mimeType.includes('word') || ['doc', 'docx'].includes(extension || '')) return 'doc';
    if (mimeType.startsWith('text/') || ['txt', 'md', 'csv'].includes(extension || '')) return 'text';
    
    return 'unknown';
  }

  private async processImage(file: File): Promise<FileProcessingResult> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      const prompt = `
Phân tích hình ảnh này và trích xuất nội dung văn bản. 
Nếu có biểu đồ, bảng, hoặc thông tin trực quan, hãy mô tả chi tiết.
Trả về nội dung một cách có cấu trúc và rõ ràng để có thể tạo câu hỏi.
`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        }
      ]);

      const response = await result.response;
      const content = response.text();

      return {
        content,
        type: 'image'
      };
    } catch (error) {
      return {
        content: '',
        type: 'image',
        error: `Lỗi xử lý ảnh: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async processPDF(file: File): Promise<FileProcessingResult> {
    try {
      // Convert to base64 for AI processing
      const base64Data = await this.fileToBase64(file);
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
Đây là file PDF. Hãy trích xuất và phân tích nội dung văn bản từ file này.
Tóm tắt nội dung chính và cung cấp thông tin chi tiết để có thể tạo câu hỏi.
Nếu có bảng, biểu đồ hoặc hình ảnh, hãy mô tả chúng.
`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        }
      ]);

      const response = await result.response;
      const content = response.text();

      return {
        content,
        type: 'document'
      };
    } catch (error) {
      return {
        content: '',
        type: 'document',
        error: `Lỗi xử lý PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async processDocument(file: File): Promise<FileProcessingResult> {
    try {
      // For DOC/DOCX files, convert to base64 and let AI process
      const base64Data = await this.fileToBase64(file);
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
Đây là file tài liệu Word. Hãy trích xuất và phân tích nội dung văn bản từ file này.
Tóm tắt nội dung chính và cung cấp thông tin chi tiết để có thể tạo câu hỏi.
Bao gồm cả định dạng, tiêu đề, và cấu trúc của tài liệu.
`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
        }
      ]);

      const response = await result.response;
      const content = response.text();

      return {
        content,
        type: 'document'
      };
    } catch (error) {
      return {
        content: '',
        type: 'document',
        error: `Lỗi xử lý tài liệu: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async processTextFile(file: File): Promise<FileProcessingResult> {
    try {
      const text = await this.readTextFile(file);
      return {
        content: text,
        type: 'text'
      };
    } catch (error) {
      return {
        content: '',
        type: 'text',
        error: `Lỗi đọc file text: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  }
}

export const getSupportedFileTypes = () => {
  return {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    documents: ['.pdf', '.doc', '.docx'],
    text: ['.txt', '.md', '.csv', '.json'],
    mimeTypes: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/*'
    ]
  };
};
