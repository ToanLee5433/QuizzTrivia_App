import React from 'react';

const I18nDebugger: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: 'red',
      color: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      zIndex: 99999,
      width: '300px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'darkred', 
        color: 'white', 
        padding: '10px', 
        marginBottom: '15px',
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        🚨 DEBUG PANEL 🚨
      </div>
      
      <div style={{marginBottom: '15px'}}>
        <div>Status: Visible ✅</div>
        <div>Time: {new Date().toLocaleTimeString()}</div>
      </div>
      
      <button 
        onClick={() => {
          alert('Debug button clicked!');
          console.log('🔍 DEBUG: Button clicked at', new Date());
          
          // Test i18n if available
          try {
            const { useTranslation } = require('react-i18next');
            console.log('i18next is available');
          } catch (e) {
            console.log('i18next not available:', e);
          }
        }}
        style={{
          width: '100%', 
          padding: '12px', 
          backgroundColor: 'yellow', 
          color: 'black', 
          border: 'none', 
          borderRadius: '6px', 
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '16px'
        }}
      >
        🔍 CLICK HERE TO DEBUG
      </button>
    </div>
  );
};

export default I18nDebugger;
