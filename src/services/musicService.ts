/**
 * Music Service for Background Music Management
 * Handles lobby, game, and victory music with crossfade support
 */

import { Howl } from 'howler';

// Music types
export type MusicType = 'lobby' | 'game' | 'victory';

// Music track configuration
interface MusicTrack {
  src: string;
  volume: number;
  loop: boolean;
}

// Music tracks configuration
const musicTracks: Record<MusicType, MusicTrack> = {
  lobby: {
    src: '/music/lobby-music.mp3',
    volume: 0.4,
    loop: true,
  },
  game: {
    src: '/music/game-music.mp3',
    volume: 0.3,
    loop: true,
  },
  victory: {
    src: '/music/victory-music.mp3',
    volume: 0.5,
    loop: false,
  },
};

class MusicService {
  private tracks: Map<MusicType, Howl> = new Map();
  private currentTrack: MusicType | null = null;
  private enabled: boolean = true;
  private globalVolume: number = 1;
  private unlocked: boolean = false;

  constructor() {
    // Check localStorage for music setting
    this.loadSettings();
    
    // Pre-load all music tracks
    this.preloadTracks();
    
    // Listen for settings changes
    this.listenForSettingsChanges();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    const musicEnabled = localStorage.getItem('musicPlayerEnabled');
    this.enabled = musicEnabled === 'true';
    
    const volume = localStorage.getItem('musicVolume');
    if (volume) {
      this.globalVolume = parseFloat(volume);
    }
  }

  /**
   * Listen for localStorage changes (when user toggles settings)
   */
  private listenForSettingsChanges(): void {
    // Custom event listener for settings changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'musicPlayerEnabled') {
        const newValue = e.newValue === 'true';
        this.setEnabled(newValue);
      } else if (e.key === 'musicVolume') {
        const newVolume = parseFloat(e.newValue || '1');
        this.setVolume(newVolume);
      }
    });
  }

  /**
   * Pre-load all music tracks for instant playback
   */
  private preloadTracks(): void {
    Object.entries(musicTracks).forEach(([type, config]) => {
      const howl = new Howl({
        src: [config.src],
        volume: config.volume * this.globalVolume,
        loop: config.loop,
        preload: true,
        html5: true, // Use HTML5 Audio for better streaming
        onload: () => {
          console.log(`[MusicService] ${type} music loaded`);
        },
        onloaderror: (_id, error) => {
          console.warn(`[MusicService] Failed to load ${type} music:`, error);
        },
        onplayerror: () => {
          console.warn(`[MusicService] Play error for ${type}, unlocking...`);
          this.unlock();
        },
      });
      this.tracks.set(type as MusicType, howl);
    });
  }

  /**
   * Unlock audio context (required for autoplay policy)
   * Call this on user interaction
   */
  unlock(): void {
    if (this.unlocked) return;
    
    // Create a silent sound to unlock
    const unlock = new Howl({
      src: ['data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v////////////////////////////////////////////////////////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQAAAAAAAAAAYZHzLfxAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=='],
      volume: 0,
      onend: () => {
        this.unlocked = true;
        console.log('[MusicService] Audio context unlocked');
      },
    });
    unlock.play();
  }

  /**
   * Check if audio is unlocked
   */
  isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Play music track
   * @param type - Type of music to play
   * @param fadeIn - Optional fade in duration in ms
   */
  play(type: MusicType, fadeIn: number = 0): void {
    if (!this.enabled) {
      console.log('[MusicService] Music is disabled');
      return;
    }

    const track = this.tracks.get(type);
    if (!track) {
      console.warn(`[MusicService] Track ${type} not found`);
      return;
    }

    // Stop current track if different
    if (this.currentTrack && this.currentTrack !== type) {
      this.stop();
    }

    // Don't restart if same track is already playing
    if (this.currentTrack === type && track.playing()) {
      return;
    }

    this.currentTrack = type;
    const config = musicTracks[type];
    const targetVolume = config.volume * this.globalVolume;

    if (fadeIn > 0) {
      track.volume(0);
      track.play();
      track.fade(0, targetVolume, fadeIn);
    } else {
      track.volume(targetVolume);
      track.play();
    }

    console.log(`[MusicService] Playing ${type} music`);
  }

  /**
   * Stop current music
   * @param fadeOut - Optional fade out duration in ms
   */
  stop(fadeOut: number = 0): void {
    if (!this.currentTrack) return;

    const track = this.tracks.get(this.currentTrack);
    if (!track) return;

    if (fadeOut > 0) {
      track.fade(track.volume(), 0, fadeOut);
      setTimeout(() => {
        track.stop();
      }, fadeOut);
    } else {
      track.stop();
    }

    console.log(`[MusicService] Stopped ${this.currentTrack} music`);
    this.currentTrack = null;
  }

  /**
   * Stop all music tracks
   */
  stopAll(): void {
    this.tracks.forEach((track, type) => {
      if (track.playing()) {
        track.stop();
        console.log(`[MusicService] Stopped ${type} music`);
      }
    });
    this.currentTrack = null;
  }

  /**
   * Crossfade from current track to new track
   * @param toType - Type of music to crossfade to
   * @param duration - Crossfade duration in ms
   */
  crossfade(toType: MusicType, duration: number = 2000): void {
    if (!this.enabled) return;

    const toTrack = this.tracks.get(toType);
    if (!toTrack) {
      console.warn(`[MusicService] Track ${toType} not found`);
      return;
    }

    // Skip if same track
    if (this.currentTrack === toType && toTrack.playing()) {
      return;
    }

    const config = musicTracks[toType];
    const targetVolume = config.volume * this.globalVolume;

    // Fade out current track
    if (this.currentTrack) {
      const fromTrack = this.tracks.get(this.currentTrack);
      if (fromTrack && fromTrack.playing()) {
        fromTrack.fade(fromTrack.volume(), 0, duration);
        setTimeout(() => {
          fromTrack.stop();
        }, duration);
      }
    }

    // Fade in new track
    toTrack.volume(0);
    toTrack.play();
    toTrack.fade(0, targetVolume, duration);
    
    this.currentTrack = toType;
    console.log(`[MusicService] Crossfading to ${toType} music`);
  }

  /**
   * Pause current music
   */
  pause(): void {
    if (!this.currentTrack) return;

    const track = this.tracks.get(this.currentTrack);
    if (track) {
      track.pause();
      console.log(`[MusicService] Paused ${this.currentTrack} music`);
    }
  }

  /**
   * Resume current music
   */
  resume(): void {
    if (!this.currentTrack) return;

    const track = this.tracks.get(this.currentTrack);
    if (track) {
      track.play();
      console.log(`[MusicService] Resumed ${this.currentTrack} music`);
    }
  }

  /**
   * Check if a specific track is playing
   */
  isPlaying(type?: MusicType): boolean {
    if (type) {
      const track = this.tracks.get(type);
      return track ? track.playing() : false;
    }
    return this.currentTrack !== null;
  }

  /**
   * Get current track type
   */
  getCurrentTrack(): MusicType | null {
    return this.currentTrack;
  }

  /**
   * Set global volume (0 to 1)
   */
  setVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    
    // Update all track volumes
    this.tracks.forEach((track, type) => {
      const config = musicTracks[type];
      track.volume(config.volume * this.globalVolume);
    });

    console.log(`[MusicService] Volume set to ${this.globalVolume}`);
  }

  /**
   * Get global volume
   */
  getVolume(): number {
    return this.globalVolume;
  }

  /**
   * Enable/disable music
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      this.stopAll();
    }

    console.log(`[MusicService] Music ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if music is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAll();
    this.tracks.forEach((track) => {
      track.unload();
    });
    this.tracks.clear();
    console.log('[MusicService] Destroyed');
  }
}

// Singleton instance
export const musicService = new MusicService();
export default musicService;
