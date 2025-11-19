import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { store } from './lib/store'
import './lib/i18n' // Import i18n configuration
import './index.css'
import './features/multiplayer/styles/modern-animations.css' // Modern multiplayer animations
import { registerServiceWorker } from './lib/services/swManager'

// Register Service Worker for offline support
registerServiceWorker();

// =====================================================
// SUPPRESS REACTQUILL FINDDOMNODE WARNING
// =====================================================
// ReactQuill uses deprecated findDOMNode internally
// This is a known issue that will be fixed in future versions
// We suppress the warning to avoid console clutter
// Issue: https://github.com/zenoamaro/react-quill/issues/122
// =====================================================

const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (
      args[0].includes('findDOMNode') ||
      args[0].includes('Warning: findDOMNode is deprecated')
    )
  ) {
    // Suppress ReactQuill findDOMNode error
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (
      args[0].includes('findDOMNode') ||
      args[0].includes('Warning: findDOMNode is deprecated')
    )
  ) {
    // Suppress ReactQuill findDOMNode warning
    return;
  }
  originalWarn.apply(console, args);
};

// Force new build - v2.0
console.log('Quiz App - Build v2.0 - Fixed Redux');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
