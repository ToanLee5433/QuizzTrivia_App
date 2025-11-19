import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import soundService from '../services/soundService';

const SoundSettings: React.FC = () => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(soundService.isEnabled());
  const [volume, setVolume] = useState(soundService.getVolume());

  const handleToggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    soundService.setEnabled(newEnabled);
    
    // Play test sound when enabling
    if (newEnabled) {
      soundService.play('tick');
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundService.setVolume(newVolume);
    
    // Play test sound
    if (enabled) {
      soundService.play('tick');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {enabled ? (
            <Volume2 className="text-blue-600" size={20} />
          ) : (
            <VolumeX className="text-gray-400" size={20} />
          )}
          <span className="font-semibold text-gray-800">
            {t('multiplayer.sound.title')}
          </span>
        </div>
        
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-2">
          <label className="text-sm text-gray-600">
            {t('multiplayer.sound.volume')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm font-medium text-gray-700 w-10">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundSettings;
