import { Howl } from 'howler';

export type SoundType = 'correct' | 'wrong' | 'countdown' | 'gameStart' | 'tick' | 'transition' | 'powerup' | 'click' | 'join' | 'ready' | 'kick' | 'start' | 'timeup' | 'victory' | 'applause';

interface SoundConfig {
  src: string;
  volume: number;
  loop?: boolean;
}

class SoundService {
  private sounds: Map<SoundType, Howl> = new Map();
  private enabled: boolean = true;
  private masterVolume: number = 0.5;
  private audioUnlocked: boolean = false;

  private soundConfigs: Record<SoundType, SoundConfig> = {
    // Core gameplay sounds
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
    powerup: {
      src: '/sounds/powerup.mp3',
      volume: 0.7,
    },
    
    // UI interaction sounds
    click: {
      src: '/sounds/click.mp3',
      volume: 0.4,
    },
    join: {
      src: '/sounds/join.mp3',
      volume: 0.6,
    },
    ready: {
      src: '/sounds/ready.mp3',
      volume: 0.6,
    },
    kick: {
      src: '/sounds/kick.mp3',
      volume: 0.5,
    },
    start: {
      src: '/sounds/start.mp3',
      volume: 0.7,
    },
    
    // End game sounds
    timeup: {
      src: '/sounds/timeup.mp3',
      volume: 0.7,
    },
    victory: {
      src: '/sounds/victory.mp3',
      volume: 0.8,
    },
    applause: {
      src: '/sounds/applause.mp3',
      volume: 0.6,
    },
  };

  constructor() {
    this.loadFromLocalStorage();
    this.initializeSounds();
  }

  private initializeSounds(): void {
    // ⚡ Preload ALL sounds for unlock to work
    const criticalSounds = ['click', 'correct', 'wrong', 'ready', 'join'];
    
    Object.entries(this.soundConfigs).forEach(([type, config]) => {
      try {
        const isCritical = criticalSounds.includes(type);
        
        const sound = new Howl({
          src: [config.src],
          volume: config.volume * this.masterVolume,
          loop: config.loop || false,
          preload: true, // ⚡ Changed to true - preload ALL sounds
          html5: false, // ⚠️ Use Web Audio API instead of HTML5 (better pooling)
          pool: 3, // Limit concurrent instances
          onload: () => {
            console.log(`✅ Sound loaded: ${type} (${isCritical ? 'critical' : 'lazy'})`);
          },
          onloaderror: (_id, error) => {
            console.warn(`⚠️ Sound file failed to load: ${type}`, error);
          },
        });

        this.sounds.set(type as SoundType, sound);
      } catch (error) {
        console.error(`❌ Sound initialization failed: ${type}`, error);
      }
    });

    console.log('Sound service initialized', { 
      enabled: this.enabled, 
      volume: this.masterVolume,
      soundsLoaded: this.sounds.size 
    });
  }

  // ⚡ Unlock audio context (bypass browser autoplay policy)
  unlock(): void {
    if (this.audioUnlocked) return;
    
    // Only try to unlock ONE sound (click is smallest and fastest)
    const clickSound = this.sounds.get('click');
    if (!clickSound) {
      console.log('🔇 No click sound found to unlock');
      return;
    }
    
    try {
      // Force load if unloaded
      if (clickSound.state() === 'unloaded') {
        clickSound.load();
      }
      
      // Only unlock if loaded
      if (clickSound.state() === 'loaded') {
        const originalVolume = clickSound.volume();
        clickSound.volume(0); // Silent
        const id = clickSound.play();
        setTimeout(() => {
          clickSound.stop(id);
          clickSound.volume(originalVolume);
        }, 1);
        this.audioUnlocked = true;
        console.log('🔊 Audio context unlocked');
      }
    } catch (error) {
      // Silently ignore - will be unlocked on next user interaction
    }
  }

  play(type: SoundType): void {
    if (!this.enabled) return;

    // Auto-unlock on first play attempt
    if (!this.audioUnlocked) {
      this.unlock();
    }

    const sound = this.sounds.get(type);
    if (sound) {
      try {
        // Lazy load if not loaded yet
        if (sound.state() === 'unloaded') {
          sound.load();
        }
        
        sound.play();
        console.log(`🎵 Playing sound: ${type}`);
      } catch (error) {
        console.error(`❌ Error playing sound: ${type}`, error);
      }
    } else {
      console.warn(`⚠️ Sound not found: ${type}`);
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
    console.log(`Sound ${enabled ? 'enabled' : 'disabled'}`);
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
    console.log(`Volume set to ${this.masterVolume}`);
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
      console.error('Failed to load sound settings from localStorage', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('soundEnabled', String(this.enabled));
      localStorage.setItem('soundVolume', String(this.masterVolume));
    } catch (error) {
      console.error('Failed to save sound settings to localStorage', error);
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
    console.log('Sound service unloaded');
  }
}

// Singleton instance
const soundService = new SoundService();

export default soundService;
