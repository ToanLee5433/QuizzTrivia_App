import React from 'react';
import { Question } from '../../../types';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../../../../../shared/components/ui/ConfirmDialog';
import soundService from '../../../../../services/soundService';

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

  // 🔊 Play victory sound and call the original submit handler
  const handleConfirmSubmit = () => {
    soundService.play('victory');
    onConfirmSubmit();
  };

  return (
    <>
      {/* Exit Confirmation Modal */}
      <ConfirmDialog
        isOpen={modalControls.showExitModal}
        onClose={() => modalControls.setShowExitModal(false)}
        onConfirm={onConfirmExit}
        title={`⚠️ ${t('confirmDialog.exitQuiz.title')}`}
        message={t('confirmDialog.exitQuiz.message')}
        confirmText={t('confirmDialog.exitQuiz.confirm')}
        cancelText={t('confirmDialog.exitQuiz.cancel')}
        type="danger"
      />

      {/* Submit Confirmation Modal */}
      <ConfirmDialog
        isOpen={modalControls.showSubmitModal}
        onClose={() => modalControls.setShowSubmitModal(false)}
        onConfirm={handleConfirmSubmit}
        title={`✅ ${t('confirmDialog.submitQuiz.title')}`}
        message={t('confirmDialog.submitQuiz.message')}
        confirmText={t('confirmDialog.submitQuiz.confirm')}
        cancelText={t("common.cancel")}
        type="info"
      />

      {/* Unanswered Questions Modal */}
      {modalControls.showUnansweredModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('confirmDialog.unanswered.title')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('confirmDialog.unanswered.message', { count: unansweredQuestions.length })}
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
                  {t('confirmDialog.unanswered.question', { number: index + 1 })}: {question.text.slice(0, 50)}...
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => modalControls.setShowUnansweredModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('confirmDialog.unanswered.continue')}
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                {t('confirmDialog.unanswered.submitAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfirmationModals;
