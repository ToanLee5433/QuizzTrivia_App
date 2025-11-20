import { Howl } from 'howler';
import { logger } from '../utils/logger';

export type MusicType = 'lobby' | 'game' | 'victory';

interface MusicConfig {
  src: string;
  volume: number;
  loop: boolean;
}

class MusicService {
  private musics: Map<MusicType, Howl> = new Map();
  private currentMusic: MusicType | null = null;
  private enabled: boolean = true;
  private masterVolume: number = 0.4; // Lower volume for background music
  private audioUnlocked: boolean = false;
  private fadeDuration: number = 1000; // 1 second fade

  private musicConfigs: Record<MusicType, MusicConfig> = {
    lobby: {
      src: '/music/lobby-music.mp3',
      volume: 0.4,
      loop: true,
    },
    game: {
      src: '/music/game-music.mp3',
      volume: 0.5,
      loop: true,
    },
    victory: {
      src: '/music/victory-music.mp3',
      volume: 0.6,
      loop: false,
    },
  };

  constructor() {
    this.loadFromLocalStorage();
    this.initializeMusic();
  }

  private initializeMusic(): void {
    Object.entries(this.musicConfigs).forEach(([type, config]) => {
      try {
        const music = new Howl({
          src: [config.src],
          volume: config.volume * this.masterVolume,
          loop: config.loop,
          preload: type === 'lobby', // ⚡ Preload lobby music, lazy load others
          html5: true, // Use HTML5 Audio for streaming (better for long files)
          autoplay: false, // Never autoplay
          onload: () => {
            logger.debug(`✅ Music loaded: ${type}`);
          },
          onloaderror: (_id, error) => {
            logger.warn(`⚠️ Music file not found: ${type}. Please add ${config.src}`, error);
          },
          onend: () => {
            // Auto-stop when non-looping music ends
            if (!config.loop && this.currentMusic === type) {
              this.currentMusic = null;
            }
          },
        });

        this.musics.set(type as MusicType, music);
      } catch (error) {
        logger.error(`❌ Music initialization failed: ${type}`, error);
      }
    });

    logger.info('Music service initialized', {
      enabled: this.enabled,
      volume: this.masterVolume,
      musicTracks: this.musics.size,
    });
  }

  // Unlock audio context (bypass browser autoplay policy)
  unlock(): void {
    if (this.audioUnlocked) return;

    logger.info('🔓 Attempting to unlock music context...');

    const unlockAttempt = () => {
      let unlockedCount = 0;

      this.musics.forEach((music, type) => {
        try {
          // Force load lobby music
          if (type === 'lobby' && music.state() === 'unloaded') {
            music.load();
          }

          // Unlock loaded music with HTML5 Audio hack
          if (music.state() === 'loaded') {
            const originalVolume = music.volume();
            music.volume(0.01); // Very quiet
            const id = music.play();
            setTimeout(() => {
              music.stop(id);
              music.volume(originalVolume);
            }, 50);
            unlockedCount++;
          }
        } catch (error) {
          logger.warn(`⚠️ Could not unlock music: ${type}`, error);
        }
      });

      if (unlockedCount > 0) {
        this.audioUnlocked = true;
        logger.success(`🎵 Music context unlocked (${unlockedCount}/${this.musics.size} tracks)`);
        return true;
      }
      return false;
    };

    // Try immediately
    if (!unlockAttempt()) {
      // Retry after 200ms for lobby music to load
      setTimeout(unlockAttempt, 200);
    }
  }

  // Play music with smooth fade-in
  play(type: MusicType, fadeIn: boolean = true): void {
    if (!this.enabled) return;

    // Auto-unlock on first play attempt
    if (!this.audioUnlocked) {
      this.unlock();
    }

    // Stop current music if different
    if (this.currentMusic && this.currentMusic !== type) {
      this.stop(true); // Fade out current music
    }

    const music = this.musics.get(type);
    if (music) {
      try {
        // Lazy load if not loaded yet
        if (music.state() === 'unloaded') {
          music.load();
        }

        // Set volume based on fade
        if (fadeIn) {
          music.volume(0);
          music.play();
          music.fade(0, this.musicConfigs[type].volume * this.masterVolume, this.fadeDuration);
        } else {
          music.volume(this.musicConfigs[type].volume * this.masterVolume);
          music.play();
        }

        this.currentMusic = type;
        logger.info(`🎵 Playing music: ${type} ${fadeIn ? '(fade-in)' : ''}`);
      } catch (error) {
        logger.error(`❌ Error playing music: ${type}`, error);
      }
    } else {
      logger.warn(`⚠️ Music not found: ${type}`);
    }
  }

  // Stop music with smooth fade-out
  stop(fadeOut: boolean = true): void {
    if (!this.currentMusic) return;

    const music = this.musics.get(this.currentMusic);
    if (music && music.playing()) {
      if (fadeOut) {
        music.fade(music.volume(), 0, this.fadeDuration);
        setTimeout(() => {
          music.stop();
          music.volume(this.musicConfigs[this.currentMusic!].volume * this.masterVolume);
        }, this.fadeDuration);
      } else {
        music.stop();
      }

      logger.info(`🔇 Stopped music: ${this.currentMusic} ${fadeOut ? '(fade-out)' : ''}`);
      this.currentMusic = null;
    }
  }

  // Stop all music immediately
  stopAll(): void {
    this.musics.forEach(music => {
      if (music.playing()) {
        music.stop();
      }
    });
    this.currentMusic = null;
    logger.info('🔇 All music stopped');
  }

  // Pause current music
  pause(): void {
    if (!this.currentMusic) return;

    const music = this.musics.get(this.currentMusic);
    if (music && music.playing()) {
      music.pause();
      logger.info(`⏸️ Paused music: ${this.currentMusic}`);
    }
  }

  // Resume paused music
  resume(): void {
    if (!this.currentMusic) return;

    const music = this.musics.get(this.currentMusic);
    if (music && !music.playing()) {
      music.play();
      logger.info(`▶️ Resumed music: ${this.currentMusic}`);
    }
  }

  // Crossfade from current music to new music
  crossfade(toType: MusicType, duration: number = 2000): void {
    if (!this.enabled) return;

    const fromMusic = this.currentMusic ? this.musics.get(this.currentMusic) : null;
    const toMusic = this.musics.get(toType);

    if (!toMusic) {
      logger.warn(`⚠️ Cannot crossfade to: ${toType} (not found)`);
      return;
    }

    // Fade out current music
    if (fromMusic && fromMusic.playing()) {
      fromMusic.fade(fromMusic.volume(), 0, duration);
      setTimeout(() => {
        fromMusic.stop();
        fromMusic.volume(this.musicConfigs[this.currentMusic!].volume * this.masterVolume);
      }, duration);
    }

    // Fade in new music
    setTimeout(() => {
      if (toMusic.state() === 'unloaded') {
        toMusic.load();
      }

      toMusic.volume(0);
      toMusic.play();
      toMusic.fade(0, this.musicConfigs[toType].volume * this.masterVolume, duration);
      this.currentMusic = toType;

      logger.info(`🔀 Crossfading to: ${toType} (${duration}ms)`);
    }, duration / 4); // Start new music 1/4 into fade
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (!enabled) {
      this.stopAll();
    }

    this.saveToLocalStorage();
    logger.info(`Music ${enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    // Update all music volumes
    this.musics.forEach((music, type) => {
      const config = this.musicConfigs[type];
      const targetVolume = config.volume * this.masterVolume;

      if (music.playing()) {
        // Smooth volume change for playing music
        music.fade(music.volume(), targetVolume, 300);
      } else {
        music.volume(targetVolume);
      }
    });

    this.saveToLocalStorage();
    logger.info(`Music volume set to ${this.masterVolume}`);
  }

  getVolume(): number {
    return this.masterVolume;
  }

  getCurrentMusic(): MusicType | null {
    return this.currentMusic;
  }

  isPlaying(type?: MusicType): boolean {
    if (type) {
      const music = this.musics.get(type);
      return music ? music.playing() : false;
    }
    return this.currentMusic !== null;
  }

  private loadFromLocalStorage(): void {
    try {
      const savedEnabled = localStorage.getItem('musicEnabled');
      const savedVolume = localStorage.getItem('musicVolume');

      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }

      if (savedVolume !== null) {
        this.masterVolume = parseFloat(savedVolume);
      }
    } catch (error) {
      logger.error('Failed to load music settings from localStorage', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('musicEnabled', String(this.enabled));
      localStorage.setItem('musicVolume', String(this.masterVolume));
    } catch (error) {
      logger.error('Failed to save music settings to localStorage', error);
    }
  }

  // Cleanup
  unload(): void {
    this.stopAll();
    this.musics.forEach(music => music.unload());
    this.musics.clear();
    logger.info('Music service unloaded');
  }
}

// Singleton instance
const musicService = new MusicService();

export default musicService;
