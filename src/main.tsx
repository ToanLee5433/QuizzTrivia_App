import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { store } from './lib/store'
import './lib/i18n' // Import i18n configuration
import './index.css'

// Suppress ReactQuill findDOMNode warnings in development
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      args[0] && 
      typeof args[0] === 'string' && 
      args[0].includes('findDOMNode is deprecated')
    ) {
      // Suppress ReactQuill findDOMNode warnings
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Force new build - v2.0
console.log('Quiz App - Build v2.0 - Fixed Redux');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
