/**
 * CardEditor Component
 * Rich editor for creating/editing flashcards with media support
 */

import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import type { CardEditorProps, CardDifficulty } from '../types/flashcard';

export function CardEditor({
  card,
  deckId,
  onSave,
  onCancel,
  isSaving = false
}: CardEditorProps) {
  const { t } = useTranslation();
  
  // Form state
  const [front, setFront] = useState(card?.front || '');
  const [back, setBack] = useState(card?.back || '');
  const [difficulty, setDifficulty] = useState<CardDifficulty>(
    card?.difficulty || 'medium'
  );
  const [tags, setTags] = useState<string>(
    card?.tags?.join(', ') || ''
  );
  const [frontImageUrl, setFrontImageUrl] = useState(
    card?.frontMedia?.type === 'image' ? card.frontMedia.url : ''
  );
  const [backImageUrl, setBackImageUrl] = useState(
    card?.backMedia?.type === 'image' ? card.backMedia.url : ''
  );
  const [frontAudioUrl, setFrontAudioUrl] = useState(
    card?.frontMedia?.type === 'audio' ? card.frontMedia.url : ''
  );
  const [backAudioUrl, setBackAudioUrl] = useState(
    card?.backMedia?.type === 'audio' ? card.backMedia.url : ''
  );
  
  // File upload refs
  const frontImageRef = useRef<HTMLInputElement>(null);
  const backImageRef = useRef<HTMLInputElement>(null);
  const frontAudioRef = useRef<HTMLInputElement>(null);
  const backAudioRef = useRef<HTMLInputElement>(null);
  
  // Validation
  const isValid = front.trim().length > 0 && back.trim().length > 0;
  
  // Handle file upload
  const handleFileUpload = async (
    file: File,
    type: 'frontImage' | 'backImage' | 'frontAudio' | 'backAudio'
  ) => {
    // TODO: Implement file upload to Firebase Storage
    // For now, create a local URL
    const url = URL.createObjectURL(file);
    
    switch (type) {
      case 'frontImage':
        setFrontImageUrl(url);
        break;
      case 'backImage':
        setBackImageUrl(url);
        break;
      case 'frontAudio':
        setFrontAudioUrl(url);
        break;
      case 'backAudio':
        setBackAudioUrl(url);
        break;
    }
  };
  
  // Handle save
  const handleSave = async () => {
    if (!isValid) return;
    
    const updatedCard = {
      ...card,
      front: front.trim(),
      back: back.trim(),
      difficulty,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      frontMedia: frontImageUrl
        ? { type: 'image' as const, url: frontImageUrl }
        : frontAudioUrl
        ? { type: 'audio' as const, url: frontAudioUrl }
        : undefined,
      backMedia: backImageUrl
        ? { type: 'image' as const, url: backImageUrl }
        : backAudioUrl
        ? { type: 'audio' as const, url: backAudioUrl }
        : undefined,
      deckId: deckId || card?.deckId
    };
    
    await onSave(updatedCard);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 space-y-6">
        {/* Front side */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('flashcard.card.front')} *
          </label>
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder={t('flashcard.editor.frontPlaceholder')}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          
          {/* Front media */}
          <div className="mt-2 flex gap-2">
            {/* Front image */}
            <div>
              <input
                ref={frontImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'frontImage');
                }}
              />
              <button
                type="button"
                onClick={() => frontImageRef.current?.click()}
                className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t('flashcard.editor.addImage')}
              </button>
              {frontImageUrl && (
                <button
                  type="button"
                  onClick={() => setFrontImageUrl('')}
                  className="ml-1 text-xs text-red-600 hover:text-red-700"
                >
                  {t('flashcard.actions.remove')}
                </button>
              )}
            </div>
            
            {/* Front audio */}
            <div>
              <input
                ref={frontAudioRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'frontAudio');
                }}
              />
              <button
                type="button"
                onClick={() => frontAudioRef.current?.click()}
                className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                {t('flashcard.editor.addAudio')}
              </button>
              {frontAudioUrl && (
                <button
                  type="button"
                  onClick={() => setFrontAudioUrl('')}
                  className="ml-1 text-xs text-red-600 hover:text-red-700"
                >
                  {t('flashcard.actions.remove')}
                </button>
              )}
            </div>
          </div>
          
          {/* Preview front media */}
          {frontImageUrl && (
            <div className="mt-2">
              <img src={frontImageUrl} alt="Front preview" className="h-24 rounded border" />
            </div>
          )}
        </div>
        
        {/* Back side */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('flashcard.card.back')} *
          </label>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder={t('flashcard.editor.backPlaceholder')}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          
          {/* Back media */}
          <div className="mt-2 flex gap-2">
            {/* Back image */}
            <div>
              <input
                ref={backImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'backImage');
                }}
              />
              <button
                type="button"
                onClick={() => backImageRef.current?.click()}
                className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t('flashcard.editor.addImage')}
              </button>
              {backImageUrl && (
                <button
                  type="button"
                  onClick={() => setBackImageUrl('')}
                  className="ml-1 text-xs text-red-600 hover:text-red-700"
                >
                  {t('flashcard.actions.remove')}
                </button>
              )}
            </div>
            
            {/* Back audio */}
            <div>
              <input
                ref={backAudioRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'backAudio');
                }}
              />
              <button
                type="button"
                onClick={() => backAudioRef.current?.click()}
                className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                {t('flashcard.editor.addAudio')}
              </button>
              {backAudioUrl && (
                <button
                  type="button"
                  onClick={() => setBackAudioUrl('')}
                  className="ml-1 text-xs text-red-600 hover:text-red-700"
                >
                  {t('flashcard.actions.remove')}
                </button>
              )}
            </div>
          </div>
          
          {/* Preview back media */}
          {backImageUrl && (
            <div className="mt-2">
              <img src={backImageUrl} alt="Back preview" className="h-24 rounded border" />
            </div>
          )}
        </div>
        
        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('flashcard.card.difficulty')}
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as CardDifficulty)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="easy">{t('flashcard.card.easy')}</option>
            <option value="medium">{t('flashcard.card.medium')}</option>
            <option value="hard">{t('flashcard.card.hard')}</option>
          </select>
        </div>
        
        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('flashcard.card.tags')}
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t('flashcard.editor.tagsPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('flashcard.editor.tagsHint')}
          </p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('flashcard.actions.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSaving && (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {t('flashcard.card.save')}
        </button>
      </div>
    </div>
  );
}

export default CardEditor;
