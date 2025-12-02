/**
 * 🎬 MediaTrimmer Components
 * Non-destructive video/audio trimming
 */

export { MediaTrimmerModal } from './MediaTrimmerModal';
export { TrimSlider } from './TrimSlider';
export { TimeInputs } from './TimeInputs';

// Hooks
export { useMediaDuration } from './hooks/useMediaDuration';
export { useTrimmedControl } from './hooks/useTrimmedControl';
export { useYouTubeTrim } from './hooks/useYouTubeTrim';

// Re-export types
export type { MediaTrimSettings } from '../../types';
