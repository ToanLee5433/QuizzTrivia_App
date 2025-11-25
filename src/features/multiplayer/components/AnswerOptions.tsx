import { useEffect, useState, useCallback } from 'react';

// Inline cn utility - handles objects and arrays properly
const cn = (...inputs: (string | Record<string, boolean> | undefined | false)[]) => {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(' ');
};

interface AnswerOption {
  text: string;
  id: number;
  eliminated?: boolean; // New: Mark eliminated options from 50/50 power-up
}

interface AnswerOptionsProps {
  options: AnswerOption[];
  selectedAnswer: number | null;
  onSelect: (index: number) => void;
  disabled?: boolean;
  correctAnswer?: number;
  showResults?: boolean;
}

/**
 * Enhanced answer options component with full keyboard navigation and accessibility
 * Supports Arrow keys, Enter/Space, and number keys (1-4)
 */
export function AnswerOptions({
  options,
  selectedAnswer,
  onSelect,
  disabled = false,
  correctAnswer,
  showResults = false,
}: AnswerOptionsProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [keyboardUsed, setKeyboardUsed] = useState(false);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // CRITICAL: Skip keyboard navigation when user is editing text
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true' ||
        activeElement.classList.contains('ql-editor') ||
        activeElement.closest('.ql-container') !== null
      );
      
      if (isEditingText) return;

      setKeyboardUsed(true);

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(focusedIndex);
          break;

        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          const numIndex = parseInt(e.key) - 1;
          if (numIndex < options.length) {
            setFocusedIndex(numIndex);
            onSelect(numIndex);
          }
          break;

        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          e.preventDefault();
          setFocusedIndex(options.length - 1);
          break;
      }
    },
    [focusedIndex, options.length, onSelect, disabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset keyboard mode on mouse interaction
  const handleMouseEnter = () => {
    setKeyboardUsed(false);
  };

  const getOptionState = (index: number) => {
    if (!showResults) {
      return selectedAnswer === index ? 'selected' : 'default';
    }

    if (index === correctAnswer) return 'correct';
    if (index === selectedAnswer && index !== correctAnswer) return 'wrong';
    return 'default';
  };

  const getAriaLabel = (option: AnswerOption, index: number) => {
    let label = `Option ${index + 1}: ${option.text}`;

    if (showResults) {
      if (index === correctAnswer) {
        label += ' - Correct answer';
      }
      if (index === selectedAnswer && index !== correctAnswer) {
        label += ' - Your incorrect answer';
      }
    } else if (selectedAnswer === index) {
      label += ' - Selected';
    }

    return label;
  };

  return (
    <div
      role="radiogroup"
      aria-label="Answer options"
      className="space-y-3"
      onMouseEnter={handleMouseEnter}
    >
      {options.map((option, index) => {
        const state = getOptionState(index);
        const isFocused = keyboardUsed && focusedIndex === index;
        const isEliminated = option.eliminated || false;

        return (
          <button
            key={option.id || index}
            type="button"
            role="radio"
            aria-checked={selectedAnswer === index}
            aria-label={getAriaLabel(option, index)}
            tabIndex={isFocused ? 0 : -1}
            disabled={disabled || isEliminated}
            onFocus={() => setFocusedIndex(index)}
            onClick={() => !disabled && !isEliminated && onSelect(index)}
            className={cn(
              // Base styles
              'w-full text-left p-4 rounded-lg border-2 transition-all duration-300 relative',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50',
              
              // State styles
              {
                // Default state
                'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50':
                  state === 'default' && !disabled && !isEliminated,

                // Selected state
                'border-blue-500 bg-blue-50 ring-2 ring-blue-200':
                  state === 'selected' && !disabled && !isEliminated,

                // Correct answer
                'border-green-600 bg-green-50 ring-2 ring-green-200':
                  state === 'correct',

                // Wrong answer
                'border-red-600 bg-red-50 ring-2 ring-red-200':
                  state === 'wrong',

                // Eliminated by 50/50 power-up
                'opacity-30 cursor-not-allowed border-gray-200 bg-gray-100': isEliminated,

                // Disabled
                'opacity-50 cursor-not-allowed': disabled && !isEliminated,

                // Keyboard focus
                'ring-4 ring-blue-500/50 scale-[1.02]': isFocused && !isEliminated,
              }
            )}
          >
            {/* Eliminated X Overlay */}
            {isEliminated && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200/80 rounded-lg">
                <div className="text-6xl font-bold text-red-500">✕</div>
              </div>
            )}
            <div className="flex items-center gap-3">
              {/* Option number badge */}
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  'font-semibold text-sm transition-colors',
                  {
                    'bg-gray-200 text-gray-700': state === 'default',
                    'bg-blue-500 text-white': state === 'selected',
                    'bg-green-600 text-white': state === 'correct',
                    'bg-red-600 text-white': state === 'wrong',
                  }
                )}
                aria-hidden="true"
              >
                {index + 1}
              </div>

              {/* Option text */}
              <span
                className={cn('flex-1 text-base', {
                  'text-gray-900': state === 'default',
                  'text-blue-900 font-medium': state === 'selected',
                  'text-green-900 font-medium': state === 'correct',
                  'text-red-900 font-medium': state === 'wrong',
                })}
              >
                {option.text}
              </span>

              {/* Result indicator */}
              {showResults && (
                <div className="flex-shrink-0" aria-hidden="true">
                  {state === 'correct' && (
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {state === 'wrong' && (
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}

      {/* Keyboard hints (screen reader only) */}
      <div className="sr-only" role="note">
        Use arrow keys to navigate, Enter or Space to select, or press number keys 1-4 to select
        directly.
      </div>
    </div>
  );
}
