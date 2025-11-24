import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Music Player
  isMusicPlayerEnabled: boolean;
  toggleMusicPlayer: () => void;
  
  // Sync Notifications
  showSyncNotifications: boolean;
  toggleSyncNotifications: () => void;
  
  // Notifications
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  
  // Sound Effects
  soundEffectsEnabled: boolean;
  toggleSoundEffects: () => void;
  
  // Language (already handled by i18n, but we can expose it here)
  // Auto-save
  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;
  
  // Accessibility
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
  
  // Font Size
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Load settings from localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const [isMusicPlayerEnabled, setIsMusicPlayerEnabled] = useState(() => {
    const saved = localStorage.getItem('musicPlayerEnabled');
    return saved === 'true'; // Default false
  });

  const [showSyncNotifications, setShowSyncNotifications] = useState(() => {
    const saved = localStorage.getItem('showSyncNotifications');
    return saved === 'true'; // Default false (like music player)
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved !== 'false'; // Default true
  });

  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEffectsEnabled');
    return saved !== 'false'; // Default true
  });

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved !== 'false'; // Default true
  });

  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem('reducedMotion');
    return saved === 'true'; // Default false
  });

  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>(() => {
    const saved = localStorage.getItem('fontSize');
    return (saved as 'small' | 'medium' | 'large') || 'medium';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply font size
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font-size', fontSize);
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  // Apply reduced motion
  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    localStorage.setItem('reducedMotion', String(reducedMotion));
  }, [reducedMotion]);

  // Save other settings
  useEffect(() => {
    localStorage.setItem('musicPlayerEnabled', String(isMusicPlayerEnabled));
  }, [isMusicPlayerEnabled]);

  useEffect(() => {
    localStorage.setItem('showSyncNotifications', String(showSyncNotifications));
  }, [showSyncNotifications]);

  useEffect(() => {
    localStorage.setItem('notificationsEnabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('soundEffectsEnabled', String(soundEffectsEnabled));
  }, [soundEffectsEnabled]);

  useEffect(() => {
    localStorage.setItem('autoSaveEnabled', String(autoSaveEnabled));
  }, [autoSaveEnabled]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleMusicPlayer = () => {
    setIsMusicPlayerEnabled(prev => !prev);
  };

  const toggleSyncNotifications = () => {
    setShowSyncNotifications(prev => !prev);
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(prev => !prev);
  };

  const toggleSoundEffects = () => {
    setSoundEffectsEnabled(prev => !prev);
  };

  const toggleAutoSave = () => {
    setAutoSaveEnabled(prev => !prev);
  };

  const toggleReducedMotion = () => {
    setReducedMotion(prev => !prev);
  };

  const setFontSize = (size: 'small' | 'medium' | 'large') => {
    setFontSizeState(size);
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        toggleTheme,
        isMusicPlayerEnabled,
        toggleMusicPlayer,
        showSyncNotifications,
        toggleSyncNotifications,
        notificationsEnabled,
        toggleNotifications,
        soundEffectsEnabled,
        toggleSoundEffects,
        autoSaveEnabled,
        toggleAutoSave,
        reducedMotion,
        toggleReducedMotion,
        fontSize,
        setFontSize,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
