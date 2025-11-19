import { Howl } from 'howler';
import { logger } from '../utils/logger';

export type SoundType = 'correct' | 'wrong' | 'countdown' | 'gameStart' | 'tick' | 'transition';

interface SoundConfig {
  src: string;
  volume: number;
  loop?: boolean;
}

class SoundService {
  private sounds: Map<SoundType, Howl> = new Map();
  private enabled: boolean = true;
  private masterVolume: number = 0.5;

  private soundConfigs: Record<SoundType, SoundConfig> = {
    correct: {
      src: '/sounds/correct.mp3',
      volume: 0.7,
    },
    wrong: {
      src: '/sounds/wrong.mp3',
      volume: 0.6,
    },
    countdown: {
      src: '/sounds/countdown.mp3',
      volume: 0.5,
    },
    gameStart: {
      src: '/sounds/game-start.mp3',
      volume: 0.8,
    },
    tick: {
      src: '/sounds/tick.mp3',
      volume: 0.3,
    },
    transition: {
      src: '/sounds/transition.mp3',
      volume: 0.5,
    },
  };

  constructor() {
    this.loadFromLocalStorage();
    this.initializeSounds();
  }

  private initializeSounds(): void {
    Object.entries(this.soundConfigs).forEach(([type, config]) => {
      try {
        const sound = new Howl({
          src: [config.src],
          volume: config.volume * this.masterVolume,
          loop: config.loop || false,
          preload: false, // Don't preload to avoid errors with missing files
          html5: true, // Use HTML5 Audio for better mobile support
          onloaderror: () => {
            // Silently fail if sound file doesn't exist (not critical)
            logger.debug(`Sound file not found (optional): ${type}`);
          },
        });

        this.sounds.set(type as SoundType, sound);
      } catch {
        logger.debug(`Sound file not available: ${type}`);
      }
    });

    logger.info('Sound service initialized', { 
      enabled: this.enabled, 
      volume: this.masterVolume,
      soundsLoaded: this.sounds.size 
    });
  }

  play(type: SoundType): void {
    if (!this.enabled) return;

    const sound = this.sounds.get(type);
    if (sound) {
      try {
        sound.play();
        logger.debug(`Playing sound: ${type}`);
      } catch (error) {
        logger.error(`Error playing sound: ${type}`, error);
      }
    } else {
      logger.warn(`Sound not found: ${type}`);
    }
  }

  stop(type: SoundType): void {
    const sound = this.sounds.get(type);
    if (sound) {
      sound.stop();
    }
  }

  stopAll(): void {
    this.sounds.forEach(sound => sound.stop());
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.saveToLocalStorage();
    logger.info(`Sound ${enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update all sound volumes
    this.sounds.forEach((sound, type) => {
      const config = this.soundConfigs[type];
      sound.volume(config.volume * this.masterVolume);
    });

    this.saveToLocalStorage();
    logger.info(`Volume set to ${this.masterVolume}`);
  }

  getVolume(): number {
    return this.masterVolume;
  }

  private loadFromLocalStorage(): void {
    try {
      const savedEnabled = localStorage.getItem('soundEnabled');
      const savedVolume = localStorage.getItem('soundVolume');

      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }

      if (savedVolume !== null) {
        this.masterVolume = parseFloat(savedVolume);
      }
    } catch (error) {
      logger.error('Failed to load sound settings from localStorage', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('soundEnabled', String(this.enabled));
      localStorage.setItem('soundVolume', String(this.masterVolume));
    } catch (error) {
      logger.error('Failed to save sound settings to localStorage', error);
    }
  }

  // Play a sequence of sounds
  playSequence(sounds: SoundType[], interval: number = 500): void {
    sounds.forEach((sound, index) => {
      setTimeout(() => this.play(sound), index * interval);
    });
  }

  // Cleanup
  unload(): void {
    this.sounds.forEach(sound => sound.unload());
    this.sounds.clear();
    logger.info('Sound service unloaded');
  }
}

// Singleton instance
const soundService = new SoundService();

export default soundService;
