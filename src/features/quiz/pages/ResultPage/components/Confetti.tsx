import React from 'react';

export const Confetti: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`
          }}
        >
          <div 
            className="w-2 h-2 bg-yellow-400 rounded-full"
            style={{
              backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'][Math.floor(Math.random() * 5)]
            }}
          />
        </div>
      ))}
    </div>
  );
};
