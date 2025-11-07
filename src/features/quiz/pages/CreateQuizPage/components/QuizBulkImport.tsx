import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Question } from '../types';

interface QuizBulkImportProps {
  onQuestionsImported: (questions: Question[]) => void;
}

const QuizBulkImport: React.FC<QuizBulkImportProps> = ({ onQuestionsImported }) => {
  const { t } = useTranslation();
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
        const typeLabel = t(`quizCreation.bulkImport.fileTypes.${fileType}`);
        toast.error(t('quizCreation.bulkImport.toast.invalidFile', { type: typeLabel }));
        setUploading(false);
        return;
      }

      // Parse file content
      const questions = await parseFile(file, fileType);
      
      if (questions.length === 0) {
        toast.error(t('quizCreation.bulkImport.toast.noQuestions'));
        setUploading(false);
        return;
      }

      onQuestionsImported(questions);
      toast.success(t('quizCreation.bulkImport.toast.success', { count: questions.length }));
      setIsOpen(false);
      
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error(t('quizCreation.bulkImport.toast.parseError'));
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
    const headers = [
      t('quizCreation.bulkImport.template.headers.question'),
      t('quizCreation.bulkImport.template.headers.answerA'),
      t('quizCreation.bulkImport.template.headers.answerB'),
      t('quizCreation.bulkImport.template.headers.answerC'),
      t('quizCreation.bulkImport.template.headers.answerD'),
      t('quizCreation.bulkImport.template.headers.correctAnswer'),
      t('quizCreation.bulkImport.template.headers.explanation'),
      t('quizCreation.bulkImport.template.headers.points')
    ];
    const sampleRow = [
      t('quizCreation.bulkImport.template.sample.question'),
      t('quizCreation.bulkImport.template.sample.answerA'),
      t('quizCreation.bulkImport.template.sample.answerB'),
      t('quizCreation.bulkImport.template.sample.answerC'),
      t('quizCreation.bulkImport.template.sample.answerD'),
      t('quizCreation.bulkImport.template.sample.correctAnswer'),
      t('quizCreation.bulkImport.template.sample.explanation'),
      t('quizCreation.bulkImport.template.sample.points')
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
        <span>{t('quizCreation.bulkImport.button')}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{t('quizCreation.bulkImport.modalTitle')}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* File Format Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">{t('quizCreation.bulkImport.instructionsTitle')}</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {t('quizCreation.bulkImport.instructions.column1')}</li>
                  <li>• {t('quizCreation.bulkImport.instructions.columns2To5')}</li>
                  <li>• {t('quizCreation.bulkImport.instructions.column6')}</li>
                  <li>• {t('quizCreation.bulkImport.instructions.column7')}</li>
                  <li>• {t('quizCreation.bulkImport.instructions.column8')}</li>
                </ul>
              </div>

              {/* Template Download */}
              <div className="flex space-x-2">
                <button
                  onClick={() => downloadTemplate('csv')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  {t('quizCreation.bulkImport.downloadCsvTemplate')}
                </button>
                <button
                  onClick={() => downloadTemplate('excel')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  {t('quizCreation.bulkImport.downloadExcelTemplate')}
                </button>
              </div>

              {/* File Upload Options */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('quizCreation.bulkImport.selectCsv')}
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
                    {t('quizCreation.bulkImport.selectExcel')}
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
                  <span className="ml-2 text-blue-600">{t('quizCreation.bulkImport.uploading')}</span>
                </div>
              )}

              {/* Tips */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>{t('quizCreation.bulkImport.tipTitle')}</strong> {t('quizCreation.bulkImport.tipDescription')}
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
