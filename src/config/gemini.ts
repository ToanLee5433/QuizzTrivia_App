// Environment configuration for Gemini AI
export const GEMINI_CONFIG = {
  // Sử dụng Firebase Web API Key (có thể dùng cho Gemini API)
  API_KEY: 'AIzaSyB6bUM5UFLNcwPYDFPkdW2i6uy-QH7ldsA', // Firebase Web API Key
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  VISION_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent',
  
  // Cấu hình miễn phí
  FREE_TIER: {
    MAX_REQUESTS_PER_MINUTE: 15,
    MAX_TOKENS_PER_REQUEST: 2048,
    SUPPORTED_MODELS: ['gemini-pro', 'gemini-pro-vision']
  }
};
