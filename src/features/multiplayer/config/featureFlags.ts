/**
 * Feature Flags for Modern Multiplayer
 * Enable/disable new UI components
 */

export const FEATURE_FLAGS = {
  // Enable modern UI components (ModernLobby, ModernQuizGame, FinalPodium)
  ENABLE_MODERN_UI: false,

  // Enable power-ups system (50/50, x2 Score, Freeze Time)
  ENABLE_POWER_UPS: false,

  // Enable intermediate leaderboard (show rankings after each question)
  ENABLE_INTERMEDIATE_LEADERBOARD: false,

  // Enable music controls in lobby
  ENABLE_MUSIC_CONTROLS: true,

  // Enable confetti effects
  ENABLE_CONFETTI: true,

  // Enable QR code generation for joining
  ENABLE_QR_CODE: true,

  // Enable animated backgrounds (blob effects)
  ENABLE_ANIMATED_BACKGROUNDS: true,

  // Enable haptic feedback on mobile
  ENABLE_HAPTIC_FEEDBACK: true,

  // Enable GIF memes for results
  ENABLE_GIF_MEMES: false, // Disabled until Giphy API key is configured

  // Enable live reactions (emoji flying)
  ENABLE_LIVE_REACTIONS: false, // Future feature

  // Enable avatar customization
  ENABLE_AVATAR_CUSTOMIZATION: false, // Future feature

  // Fallback to old UI if modern UI fails
  FALLBACK_TO_OLD_UI: true,

  // Debug mode: Show extra logs and info
  DEBUG_MODE: false
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};

/**
 * Get all enabled features
 */
export const getEnabledFeatures = (): FeatureFlag[] => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([flag]) => flag as FeatureFlag);
};

/**
 * Get all disabled features
 */
export const getDisabledFeatures = (): FeatureFlag[] => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => !enabled)
    .map(([flag]) => flag as FeatureFlag);
};

// Log feature flags in development
if (import.meta.env.DEV) {
  console.log('🎮 Modern Multiplayer Feature Flags:', FEATURE_FLAGS);
  console.log('✅ Enabled:', getEnabledFeatures());
  console.log('❌ Disabled:', getDisabledFeatures());
}
