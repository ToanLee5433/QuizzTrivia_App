/**
 * Keyboard utilities for handling keyboard shortcuts without conflicting
 * with text editing components like Rich Text Editor (ReactQuill)
 */

/**
 * Check if the user is currently editing text (input, textarea, or rich text editor)
 * Use this to prevent keyboard shortcuts from triggering when user is typing
 * 
 * @returns true if user is currently editing text
 */
export function isUserEditingText(): boolean {
  const activeElement = document.activeElement;
  
  if (!activeElement) return false;
  
  // Check common editable elements
  if (activeElement.tagName === 'INPUT') return true;
  if (activeElement.tagName === 'TEXTAREA') return true;
  
  // Check contenteditable (used by rich text editors)
  if (activeElement.getAttribute('contenteditable') === 'true') return true;
  
  // Check ReactQuill specifically
  if (activeElement.classList.contains('ql-editor')) return true;
  
  // Check if inside a Quill container (for any nested elements)
  if (activeElement.closest('.ql-container') !== null) return true;
  
  // Check other rich text editors
  if (activeElement.closest('[data-slate-editor]') !== null) return true; // Slate
  if (activeElement.closest('.tox-edit-area') !== null) return true; // TinyMCE
  if (activeElement.closest('.ProseMirror') !== null) return true; // ProseMirror
  if (activeElement.closest('.ck-editor__editable') !== null) return true; // CKEditor
  
  return false;
}

/**
 * Create a keyboard event handler that respects text editing
 * 
 * @param handler The keyboard event handler to wrap
 * @param options Options for the wrapper
 * @returns Wrapped handler that skips when user is editing
 */
export function createSafeKeyboardHandler(
  handler: (e: KeyboardEvent) => void,
  options: {
    /** Always handle certain keys even when editing */
    alwaysHandleKeys?: string[];
    /** Skip the check entirely for these keys */
    bypassKeys?: string[];
  } = {}
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    const { alwaysHandleKeys = [], bypassKeys = [] } = options;
    
    // Bypass check for certain keys
    if (bypassKeys.includes(e.key)) {
      handler(e);
      return;
    }
    
    // Check if user is editing text
    if (isUserEditingText()) {
      // Still handle certain keys even when editing (if specified)
      if (alwaysHandleKeys.includes(e.key)) {
        handler(e);
      }
      return; // Skip handler for other keys
    }
    
    handler(e);
  };
}

/**
 * Key codes that commonly conflict with text editing
 */
export const EDITING_CONFLICT_KEYS = {
  SPACE: ' ',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  HOME: 'Home',
  END: 'End',
} as const;
