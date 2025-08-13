import React from 'react';

const I18nDebugger: React.FC = () => {
  console.log('🚨 I18nDebugger component rendered!');
  
  return (
    <div 
      id="i18n-debug-panel"
      style={{
        position: 'fixed',
        top: '50px',
        right: '50px',
        backgroundColor: '#ff0000',
        color: '#ffffff',
        padding: '30px',
        borderRadius: '15px',
        border: '5px solid #ffffff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        zIndex: 999999,
        width: '400px',
        fontSize: '16px',
        fontFamily: 'monospace',
        fontWeight: 'bold'
      }}
    >
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        fontSize: '20px'
      }}>
        🚨 DEBUG PANEL VISIBLE 🚨
      </div>
      
      <div style={{marginBottom: '20px'}}>
        Current Time: {new Date().toLocaleString()}
      </div>
      
      <button 
        onClick={() => {
          console.log('🔍 DEBUG BUTTON CLICKED!');
          alert('DEBUG: Panel is working!');
        }}
        style={{
          width: '100%',
          padding: '15px',
          backgroundColor: '#ffff00',
          color: '#000000',
          border: '3px solid #000000',
          borderRadius: '10px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        CLICK TO TEST
      </button>
    </div>
  );
};

export default I18nDebugger;
