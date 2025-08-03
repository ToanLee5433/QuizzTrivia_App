// File Processing Services
// Cài đặt dependencies: npm install tesseract.js pdf-parse mammoth xlsx

import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface FileProcessingResult {
  extractedText: string;
  success: boolean;
  error?: string;
  metadata?: any;
}

/**
 * OCR Service - Trích xuất text từ hình ảnh
 */
export class OCRService {
  private static worker: any = null;

  static async initializeWorker() {
    if (!this.worker) {
      this.worker = await createWorker();
      await this.worker.loadLanguage('eng+vie');
      await this.worker.initialize('eng+vie');
    }
    return this.worker;
  }

  static async extractTextFromImage(file: File): Promise<FileProcessingResult> {
    try {
      const worker = await this.initializeWorker();
      
      // Đọc file thành blob URL để OCR
      const imageUrl = URL.createObjectURL(file);
      
      const { data: { text, confidence } } = await worker.recognize(imageUrl);
      
      // Clean up
      URL.revokeObjectURL(imageUrl);
      
      return {
        extractedText: text,
        success: true,
        metadata: { confidence, fileSize: file.size }
      };
    } catch (error) {
      return {
        extractedText: '',
        success: false,
        error: `OCR Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async terminateWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * PDF Service - Trích xuất text từ PDF
 */
export class PDFService {
  static async extractTextFromPDF(file: File): Promise<FileProcessingResult> {
    try {
      // Đọc file PDF
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const totalPages = pdf.numPages;
      
      // Trích xuất text từ tất cả các trang
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += `\n--- Trang ${i} ---\n${pageText}\n`;
      }
      
      return {
        extractedText: fullText.trim(),
        success: true,
        metadata: { 
          totalPages, 
          fileSize: file.size,
          fileName: file.name 
        }
      };
    } catch (error) {
      return {
        extractedText: '',
        success: false,
        error: `PDF Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

/**
 * Word Document Service - Trích xuất text từ .docx
 */
export class WordService {
  static async extractTextFromWord(file: File): Promise<FileProcessingResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Sử dụng mammoth để đọc .docx
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      return {
        extractedText: result.value,
        success: true,
        metadata: {
          fileSize: file.size,
          fileName: file.name,
          messages: result.messages // Warnings từ mammoth
        }
      };
    } catch (error) {
      return {
        extractedText: '',
        success: false,
        error: `Word Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

/**
 * Excel/Spreadsheet Service - Trích xuất data từ Excel/CSV
 */
export class SpreadsheetService {
  static async extractTextFromSpreadsheet(file: File): Promise<FileProcessingResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      let fullText = '';
      
      // Đọc tất cả worksheets
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        fullText += `\n=== Sheet: ${sheetName} ===\n${csvText}\n`;
      });
      
      return {
        extractedText: fullText.trim(),
        success: true,
        metadata: {
          fileSize: file.size,
          fileName: file.name,
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames
        }
      };
    } catch (error) {
      return {
        extractedText: '',
        success: false,
        error: `Spreadsheet Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

/**
 * Text File Service - Đọc plain text files
 */
export class TextService {
  static async extractTextFromTextFile(file: File): Promise<FileProcessingResult> {
    try {
      const text = await file.text();
      
      return {
        extractedText: text,
        success: true,
        metadata: {
          fileSize: file.size,
          fileName: file.name
        }
      };
    } catch (error) {
      return {
        extractedText: '',
        success: false,
        error: `Text Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

/**
 * Main File Processor - Router để xử lý các loại file khác nhau
 */
export class FileProcessor {
  static getSupportedTypes() {
    return {
      images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
      documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
      spreadsheets: ['.csv', '.xlsx', '.xls']
    };
  }

  static isFileSupported(fileName: string): boolean {
    const lowercaseName = fileName.toLowerCase();
    const supportedTypes = this.getSupportedTypes();
    
    return Object.values(supportedTypes)
      .flat()
      .some(ext => lowercaseName.endsWith(ext));
  }

  static async processFile(file: File): Promise<FileProcessingResult> {
    const fileName = file.name.toLowerCase();
    const supportedTypes = this.getSupportedTypes();
    
    try {
      // Check file size (limit 50MB)
      if (file.size > 50 * 1024 * 1024) {
        return {
          extractedText: '',
          success: false,
          error: 'File quá lớn. Vui lòng chọn file nhỏ hơn 50MB.'
        };
      }

      // Route to appropriate service
      if (supportedTypes.images.some(ext => fileName.endsWith(ext))) {
        return await OCRService.extractTextFromImage(file);
      }
      
      if (fileName.endsWith('.pdf')) {
        return await PDFService.extractTextFromPDF(file);
      }
      
      if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        return await WordService.extractTextFromWord(file);
      }
      
      if (supportedTypes.spreadsheets.some(ext => fileName.endsWith(ext))) {
        return await SpreadsheetService.extractTextFromSpreadsheet(file);
      }
      
      if (fileName.endsWith('.txt') || fileName.endsWith('.rtf')) {
        return await TextService.extractTextFromTextFile(file);
      }
      
      return {
        extractedText: '',
        success: false,
        error: 'Định dạng file không được hỗ trợ.'
      };
      
    } catch (error) {
      return {
        extractedText: '',
        success: false,
        error: `Processing Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Cleanup resources
  static async cleanup() {
    await OCRService.terminateWorker();
  }
}
