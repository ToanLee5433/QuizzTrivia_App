import React from 'react';
import { Question } from '../../../types';

import { useTranslation } from 'react-i18next';
interface ConfirmationModalsProps {
  modalControls: {
    showExitModal: boolean;
    setShowExitModal: React.Dispatch<React.SetStateAction<boolean>>;
    showSubmitModal: boolean;
    setShowSubmitModal: React.Dispatch<React.SetStateAction<boolean>>;
    showUnansweredModal: boolean;
    setShowUnansweredModal: React.Dispatch<React.SetStateAction<boolean>>;
  };
  onConfirmExit: () => void;
  onConfirmSubmit: () => void;
  unansweredQuestions: Question[];
  onGoToQuestion: (index: number) => void;
}

const ConfirmationModals: React.FC<ConfirmationModalsProps> = ({
  modalControls,
  onConfirmExit,
  onConfirmSubmit,
  unansweredQuestions,
  onGoToQuestion,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Exit Confirmation Modal */}
      {modalControls.showExitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bạn có chắc muốn thoát?
            </h3>
            <p className="text-gray-600 mb-6">
              Tiến độ của bạn sẽ bị mất nếu thoát bây giờ.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => modalControls.setShowExitModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={onConfirmExit}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {modalControls.showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Xác nhận nộp bài
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn nộp bài? Sau khi nộp sẽ không thể thay đổi đáp án.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => modalControls.setShowSubmitModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >{t("common.cancel")}
              </button>
              <button
                onClick={onConfirmSubmit}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unanswered Questions Modal */}
      {modalControls.showUnansweredModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Còn câu hỏi chưa trả lời
            </h3>
            <p className="text-gray-600 mb-4">
              Bạn còn {unansweredQuestions.length} câu hỏi chưa trả lời:
            </p>
            <div className="max-h-40 overflow-y-auto mb-6">
              {unansweredQuestions.map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => {
                    modalControls.setShowUnansweredModal(false);
                    onGoToQuestion(index);
                  }}
                  className="block w-full text-left p-2 hover:bg-gray-100 rounded text-blue-600 hover:text-blue-800"
                >
                  Câu {index + 1}: {question.text.slice(0, 50)}...
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => modalControls.setShowUnansweredModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={onConfirmSubmit}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Nộp bài luôn
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfirmationModals;
