import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Question } from '../types';

interface QuizBulkImportProps {
  onQuestionsImported: (questions: Question[]) => void;
}

const QuizBulkImport: React.FC<QuizBulkImportProps> = ({ onQuestionsImported }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'csv' | 'excel') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      // Validate file type
      const validTypes = fileType === 'csv' 
        ? ['text/csv', 'application/csv']
        : ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (!validTypes.some(type => file.type.includes(type) || file.name.toLowerCase().endsWith(fileType === 'csv' ? '.csv' : '.xlsx'))) {
        toast.error(`Vui lòng chọn file ${fileType.toUpperCase()} hợp lệ`);
        setUploading(false);
        return;
      }

      // Parse file content
      const questions = await parseFile(file, fileType);
      
      if (questions.length === 0) {
        toast.error('Không tìm thấy câu hỏi hợp lệ trong file');
        setUploading(false);
        return;
      }

      onQuestionsImported(questions);
      toast.success(`Đã import thành công ${questions.length} câu hỏi!`);
      setIsOpen(false);
      
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Có lỗi xảy ra khi đọc file. Vui lòng kiểm tra định dạng file.');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const parseFile = async (file: File, fileType: 'csv' | 'excel'): Promise<Question[]> => {
    const text = await file.text();
    
    if (fileType === 'csv') {
      return parseCSV(text);
    } else {
      // For Excel files, we'll treat them as CSV for simplicity
      // In a real app, you'd use a library like xlsx
      return parseCSV(text);
    }
  };

  const parseCSV = (csvText: string): Question[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const questions: Question[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (simple implementation)
      const columns = parseCSVLine(line);
      
      if (columns.length < 6) {
        console.warn(`Skipping line ${i + 1}: insufficient columns`);
        continue;
      }
      
      const [questionText, answerA, answerB, answerC, answerD, correctAnswer, explanation = '', points = '10'] = columns;
      
      if (!questionText || !answerA || !answerB || !correctAnswer) {
        console.warn(`Skipping line ${i + 1}: missing required fields`);
        continue;
      }
      
      const answers = [
        { id: 'a', text: answerA, isCorrect: correctAnswer.toLowerCase() === 'a' },
        { id: 'b', text: answerB, isCorrect: correctAnswer.toLowerCase() === 'b' },
        { id: 'c', text: answerC || '', isCorrect: correctAnswer.toLowerCase() === 'c' },
        { id: 'd', text: answerD || '', isCorrect: correctAnswer.toLowerCase() === 'd' }
      ].filter(answer => answer.text); // Remove empty answers
      
      const question: Question = {
        id: `imported-${Date.now()}-${i}`,
        text: questionText,
        type: 'multiple',
        answers,
        explanation: explanation || undefined,
        points: parseInt(points) || 10
      };
      
      questions.push(question);
    }
    
    return questions;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(field => field.replace(/^"(.*)"$/, '$1')); // Remove surrounding quotes
  };

  const downloadTemplate = (fileType: 'csv' | 'excel') => {
    const headers = ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng (A/B/C/D)', 'Giải thích (tùy chọn)', 'Điểm (mặc định 10)'];
    const sampleRow = [
      'JavaScript là ngôn ngữ gì?',
      'Ngôn ngữ lập trình',
      'Ngôn ngữ đánh dấu',
      'Hệ quản trị cơ sở dữ liệu',
      'Hệ điều hành',
      'A',
      'JavaScript là ngôn ngữ lập trình phổ biến',
      '10'
    ];
    
    const csvContent = [headers, sampleRow]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `quiz_template.${fileType === 'csv' ? 'csv' : 'xlsx'}`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
      >
        <span>📁</span>
        <span>Tải File</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">📁 Tải file câu hỏi</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* File Format Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">📋 Định dạng file:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Cột 1: Câu hỏi</li>
                  <li>• Cột 2-5: Đáp án A, B, C, D</li>
                  <li>• Cột 6: Đáp án đúng (A/B/C/D)</li>
                  <li>• Cột 7: Giải thích (tùy chọn)</li>
                  <li>• Cột 8: Điểm (mặc định 10)</li>
                </ul>
              </div>

              {/* Template Download */}
              <div className="flex space-x-2">
                <button
                  onClick={() => downloadTemplate('csv')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  📄 Tải mẫu CSV
                </button>
                <button
                  onClick={() => downloadTemplate('excel')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  📊 Tải mẫu Excel
                </button>
              </div>

              {/* File Upload Options */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📄 Chọn file CSV:
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'csv')}
                    disabled={uploading}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📊 Chọn file Excel:
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 'excel')}
                    disabled={uploading}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {uploading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-blue-600">Đang xử lý file...</span>
                </div>
              )}

              {/* Tips */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  💡 <strong>Mẹo:</strong> Sử dụng template để đảm bảo định dạng đúng. 
                  File có thể chứa nhiều câu hỏi, mỗi câu hỏi trên một dòng.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuizBulkImport;
