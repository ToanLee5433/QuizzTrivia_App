import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, X, Music, Youtube, Plus, Minimize2, Maximize2, List, Trash2, Shuffle, Repeat, History, Save, FolderOpen, Clock, ChevronUp, ChevronDown, Upload, Edit2, Search, Gauge } from 'lucide-react';
import { Howl } from 'howler';
import { storage, db, auth } from '../lib/firebase/config';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Track {
  id: string;
  url: string;
  title: string;
  type: 'youtube' | 'audio' | 'uploaded';
  duration?: number;
  storagePath?: string; // Firebase Storage path for uploaded files
  uploadedAt?: Date;
  fileSize?: number;
}

interface Album {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  tracks: Track[];
  createdAt: Date;
  updatedAt: Date;
}

interface MusicPlayerProps {
  onClose?: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ onClose }) => {
  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trackTitle, setTrackTitle] = useState('');
  const [isYouTube, setIsYouTube] = useState(false);
  
  // UI states
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [playerSize, setPlayerSize] = useState({ width: 400, height: 600 });
  const [showQueue, setShowQueue] = useState(false);
  const [queueInput, setQueueInput] = useState('');
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [miniMode, setMiniMode] = useState(false);
  
  // Enhanced features
  const [history, setHistory] = useState<Track[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  
  // New features
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [showAlbums, setShowAlbums] = useState(false);
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  
  // Refs
  const howlRef = useRef<Howl | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);

  // Utility functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const extractTitleFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'Unknown Track';
      return decodeURIComponent(filename.replace(/\.[^/.]+$/, ''));
    } catch {
      return 'Unknown Track';
    }
  };

  const addToHistory = (track: Track) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== track.id);
      return [track, ...filtered].slice(0, 50); // Keep last 50 tracks
    });
  };

  // Firebase Storage functions
  const uploadAudioFile = async (file: File, customTitle?: string) => {
    if (!auth.currentUser) {
      alert(t('musicPlayer.loginRequired'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `music/${auth.currentUser.uid}/${timestamp}_${sanitizedFileName}`;
      const fileRef = storageRef(storage, storagePath);

      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          alert(t('musicPlayer.uploadErrorWithMessage', { message: error.message }));
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const trackTitle = customTitle?.trim() || file.name.replace(/\.[^/.]+$/, '');
          
          const newTrack: Track = {
            id: Math.random().toString(36).substr(2, 9),
            url: downloadURL,
            title: trackTitle,
            type: 'uploaded',
            storagePath,
            uploadedAt: new Date(),
            fileSize: file.size
          };

          setQueue(prev => [...prev, newTrack]);
          setIsUploading(false);
          setUploadProgress(0);
          setUploadFileName('');
          
          // Save to Firestore
          await saveTrackToFirestore(newTrack);
          
          alert(t('musicPlayer.uploadSuccess'));
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert(t('musicPlayer.uploadError'));
      setIsUploading(false);
    }
  };

  const addUrlToQueue = () => {
    if (!uploadUrl.trim()) return;
    
    const customTitle = uploadFileName.trim();
    const videoId = extractYouTubeVideoId(uploadUrl);
    
    const newTrack: Track = {
      id: Math.random().toString(36).substr(2, 9),
      url: uploadUrl,
      title: customTitle || (videoId ? `YouTube: ${videoId}` : extractTitleFromUrl(uploadUrl)),
      type: videoId ? 'youtube' : 'audio'
    };
    
    setQueue(prev => [...prev, newTrack]);
    
    // Save to Firestore if logged in
    if (auth.currentUser) {
      saveTrackToFirestore(newTrack);
    }
    
    setUploadUrl('');
    setUploadFileName('');
    alert(t('musicPlayer.addedToQueue'));
  };

  const deleteUploadedTrack = async (track: Track) => {
    if (track.type !== 'uploaded' || !track.storagePath) return;

    try {
      // Delete from Firebase Storage
      const fileRef = storageRef(storage, track.storagePath);
      await deleteObject(fileRef);
      
      // Remove from queue
      removeFromQueue(track.id);
      
      // Delete from Firestore
      await deleteTrackFromFirestore(track.id);
      
      alert(t('musicPlayer.deletedFromStorage'));
    } catch (error) {
      console.error('Delete error:', error);
      alert(t('musicPlayer.deleteError'));
    }
  };

  // Firestore operations
  const saveTrackToFirestore = async (track: Track) => {
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'userTracks'), {
        userId: auth.currentUser.uid,
        trackId: track.id,
        url: track.url,
        title: track.title,
        type: track.type,
        storagePath: track.storagePath || null,
        uploadedAt: track.uploadedAt ? Timestamp.fromDate(track.uploadedAt) : null,
        fileSize: track.fileSize || null,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving track:', error);
    }
  };

  const deleteTrackFromFirestore = async (trackId: string) => {
    if (!auth.currentUser) return;

    try {
      const q = query(
        collection(db, 'userTracks'),
        where('userId', '==', auth.currentUser.uid),
        where('trackId', '==', trackId)
      );
      const snapshot = await getDocs(q);
      
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'userTracks', docSnap.id));
      }
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  };

  const loadTracksFromFirestore = async () => {
    if (!auth.currentUser) return;

    try {
      const q = query(
        collection(db, 'userTracks'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const tracks: Track[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: data.trackId,
          url: data.url,
          title: data.title,
          type: data.type,
          storagePath: data.storagePath,
          uploadedAt: data.uploadedAt?.toDate(),
          fileSize: data.fileSize
        };
      });
      
      setQueue(tracks);
    } catch (error) {
      console.error('Error loading tracks:', error);
    }
  };

  // Album operations
  const saveAlbum = async () => {
    if (!auth.currentUser || queue.length === 0 || !albumName.trim()) return;

    try {
      const newAlbum: Omit<Album, 'id'> = {
        name: albumName,
        description: albumDescription,
        tracks: queue,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'userAlbums'), {
        userId: auth.currentUser.uid,
        ...newAlbum,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      setAlbums(prev => [...prev, { ...newAlbum, id: docRef.id }]);
      setAlbumName('');
      setAlbumDescription('');
      alert(t('musicPlayer.albumSaved'));
    } catch (error) {
      console.error('Error saving album:', error);
      alert(t('musicPlayer.albumSaveError'));
    }
  };

  const loadAlbumsFromFirestore = async () => {
    if (!auth.currentUser) return;

    try {
      const q = query(
        collection(db, 'userAlbums'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const loadedAlbums: Album[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          description: data.description,
          coverUrl: data.coverUrl,
          tracks: data.tracks,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
      
      setAlbums(loadedAlbums);
    } catch (error) {
      console.error('Error loading albums:', error);
    }
  };

  const deleteAlbum = async (albumId: string) => {
    try {
      await deleteDoc(doc(db, 'userAlbums', albumId));
      setAlbums(prev => prev.filter(a => a.id !== albumId));
      alert(t('musicPlayer.albumDeleted'));
    } catch (error) {
      console.error('Error deleting album:', error);
      alert(t('musicPlayer.albumDeleteError'));
    }
  };

  const loadAlbum = (album: Album) => {
    setQueue(album.tracks);
    setCurrentAlbum(album);
    setCurrentTrackIndex(-1);
    
    if (album.tracks.length > 0) {
      setTimeout(() => playTrack(0), 100);
    }
  };

  // Track editing
  const startEditingTrack = (track: Track) => {
    setEditingTrackId(track.id);
    setEditingTitle(track.title);
  };

  const saveTrackTitle = async (trackId: string) => {
    if (!editingTitle.trim()) return;

    setQueue(prev => 
      prev.map(t => t.id === trackId ? { ...t, title: editingTitle } : t)
    );
    
    // Update in Firestore if it's an uploaded track
    if (auth.currentUser) {
      try {
        const q = query(
          collection(db, 'userTracks'),
          where('userId', '==', auth.currentUser.uid),
          where('trackId', '==', trackId)
        );
        const snapshot = await getDocs(q);
        
        for (const docSnap of snapshot.docs) {
          await updateDoc(doc(db, 'userTracks', docSnap.id), {
            title: editingTitle
          });
        }
      } catch (error) {
        console.error('Error updating track title:', error);
      }
    }
    
    setEditingTrackId(null);
    setEditingTitle('');
  };

  // Playback speed control
  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    
    if (howlRef.current && !isYouTube) {
      howlRef.current.rate(speed);
    }
    
    // Note: YouTube speed control would need iframe API integration
  };

  // Filter tracks by search query
  const filterTracks = (tracks: Track[]) => {
    if (!searchQuery.trim()) return tracks;
    
    const query = searchQuery.toLowerCase();
    return tracks.filter(track => 
      track.title.toLowerCase().includes(query) ||
      track.type.toLowerCase().includes(query)
    );
  };

  // YouTube API functions
  const loadYouTubeAPI = () => {
    if (window.YT) {
      return Promise.resolve();
    }
    
    return new Promise<void>((resolve, reject) => {
      if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const checkAPI = setInterval(() => {
          if (window.YT) {
            clearInterval(checkAPI);
            resolve();
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkAPI);
          reject(new Error('YouTube API loading timeout'));
        }, 10000);
        
        return;
      }
      
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      
      const timeout = setTimeout(() => {
        reject(new Error('YouTube API loading timeout'));
      }, 10000);
      
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        console.log('YouTube API loaded successfully');
        resolve();
      };
      
      tag.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load YouTube API script'));
      };
      
      document.head.appendChild(tag);
    });
  };

  const createYouTubePlayer = (videoId: string) => {
    console.log('Creating YouTube player for video:', videoId);
    
    const tryDirectAudio = () => {
      const proxyUrl = `https://cors-anywhere.herokuapp.com/https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&showinfo=0&modestbranding=1`;
      
      const howl = new Howl({
        src: [proxyUrl],
        html5: true,
        onload: () => {
          console.log('YouTube proxy audio loaded successfully');
          setDuration(howl.duration());
          setTrackTitle(`YouTube: ${videoId}`);
          setIsLoading(false);
        },
        onloaderror: (_id, error) => {
          console.error('YouTube proxy audio loading error:', error);
          tryAlternativeProxy();
        },
        onplay: () => {
          console.log('YouTube proxy audio started playing');
          setIsPlaying(true);
        },
        onpause: () => {
          console.log('YouTube proxy audio paused');
          setIsPlaying(false);
        },
        onend: () => {
          console.log('YouTube audio ended');
          setIsPlaying(false);
          setCurrentTime(0);
          
          if (repeatMode === 'one') {
            setTimeout(() => {
              togglePlayPause();
            }, 500);
          } else {
            playNext();
          }
        },
        onplayerror: (_id, error) => {
          console.error('YouTube proxy audio play error:', error);
          tryAlternativeProxy();
        }
      });

      howlRef.current = howl;
      setAudioUrl(proxyUrl);
    };

    const tryAlternativeProxy = () => {
      const altProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0`)}`;
      
      const howl = new Howl({
        src: [altProxyUrl],
        html5: true,
        onload: () => {
          console.log('YouTube alternative proxy audio loaded successfully');
          setDuration(howl.duration());
          setTrackTitle(`YouTube: ${videoId}`);
          setIsLoading(false);
        },
        onloaderror: (_id, error) => {
          console.error('YouTube alternative proxy audio loading error:', error);
          tryDirectEmbed();
        },
        onplay: () => {
          console.log('YouTube alternative proxy audio started playing');
          setIsPlaying(true);
        },
        onpause: () => {
          console.log('YouTube alternative proxy audio paused');
          setIsPlaying(false);
        },
        onend: () => {
          console.log('YouTube alternative proxy audio ended');
          setIsPlaying(false);
          setCurrentTime(0);
        },
        onplayerror: (_id, error) => {
          console.error('YouTube alternative proxy audio play error:', error);
          tryDirectEmbed();
        }
      });

      howlRef.current = howl;
      setAudioUrl(altProxyUrl);
    };

    const tryDirectEmbed = () => {
      console.log('Using direct YouTube embed approach');
      
      const container = document.getElementById('youtube-player');
      if (container) {
        container.innerHTML = '';
        
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&showinfo=0&modestbranding=1&disablekb=1&fs=0`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.allow = 'autoplay; encrypted-media';
        iframe.allowFullscreen = false;
        
        container.appendChild(iframe);
      }
      
      setIsLoading(false);
      setTrackTitle(`YouTube: ${videoId} (Player embed)`);
      setDuration(300);
      setIsYouTube(true);
    };

    tryDirectAudio();
  };

  // Player control functions
  const togglePlayPause = () => {
    try {
      if (isYouTube && youtubePlayerRef.current) {
        if (isPlaying) {
          youtubePlayerRef.current.pauseVideo();
        } else {
          youtubePlayerRef.current.playVideo();
        }
      } else if (howlRef.current) {
        if (isPlaying) {
          howlRef.current.pause();
        } else {
          howlRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error in togglePlayPause:', error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsSeeking(false);
    
    // Apply the seek when user releases the slider
    const target = e.target as HTMLInputElement;
    const newTime = parseFloat(target.value);
    
    try {
      if (isYouTube && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(newTime, true);
      } else if (howlRef.current) {
        howlRef.current.seek(newTime);
      }
    } catch (error) {
      console.error('Error in handleSeekEnd:', error);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    try {
      if (isYouTube && youtubePlayerRef.current) {
        youtubePlayerRef.current.setVolume(newVolume * 100);
      } else if (howlRef.current) {
        howlRef.current.volume(newVolume);
      }
    } catch (error) {
      console.error('Error in handleVolumeChange:', error);
    }
  };

  const toggleMute = () => {
    try {
      if (isYouTube && youtubePlayerRef.current) {
        if (isMuted) {
          youtubePlayerRef.current.unMute();
          youtubePlayerRef.current.setVolume(volume * 100);
          setIsMuted(false);
        } else {
          youtubePlayerRef.current.mute();
          setIsMuted(true);
        }
      } else if (howlRef.current) {
        if (isMuted) {
          howlRef.current.volume(volume);
          setIsMuted(false);
        } else {
          howlRef.current.volume(0);
          setIsMuted(true);
        }
      }
    } catch (error) {
      console.error('Error in toggleMute:', error);
    }
  };

  // Queue management functions
  const playTrack = useCallback((index: number) => {
    if (index < 0 || index >= queue.length) return;
    
    setCurrentTrackIndex(index);
    const track = queue[index];
    setInputUrl(track.url);
    setIsYouTube(track.type === 'youtube');
    
    // Add to history
    addToHistory(track);
    
    setTimeout(() => {
      loadAudio();
    }, 100);
  }, [queue]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    
    let nextIndex: number;
    
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentTrackIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return;
        }
      }
    }
    
    playTrack(nextIndex);
  }, [queue, currentTrackIndex, isShuffle, repeatMode, playTrack]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    
    let prevIndex: number;
    
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = currentTrackIndex - 1;
      if (prevIndex < 0) {
        if (repeatMode === 'all') {
          prevIndex = queue.length - 1;
        } else {
          return;
        }
      }
    }
    
    playTrack(prevIndex);
  }, [queue, currentTrackIndex, isShuffle, repeatMode, playTrack]);

  const skipForward = () => {
    if (queue.length > 0) {
      playNext();
      return;
    }
    
    const newTime = Math.min(currentTime + 10, duration);
    setCurrentTime(newTime);
    
    try {
      if (isYouTube && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(newTime, true);
      } else if (howlRef.current) {
        howlRef.current.seek(newTime);
      }
    } catch (error) {
      console.error('Error in skipForward:', error);
    }
  };

  const skipBackward = () => {
    if (queue.length > 0 && currentTime > 3) {
      const newTime = 0;
      setCurrentTime(newTime);
      
      try {
        if (isYouTube && youtubePlayerRef.current) {
          youtubePlayerRef.current.seekTo(newTime, true);
        } else if (howlRef.current) {
          howlRef.current.seek(newTime);
        }
      } catch (error) {
        console.error('Error in skipBackward:', error);
      }
      return;
    }
    
    if (queue.length > 0) {
      playPrevious();
      return;
    }
    
    const newTime = Math.max(currentTime - 10, 0);
    setCurrentTime(newTime);
    
    try {
      if (isYouTube && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(newTime, true);
      } else if (howlRef.current) {
        howlRef.current.seek(newTime);
      }
    } catch (error) {
      console.error('Error in skipBackward:', error);
    }
  };

  const addToQueue = useCallback((urls: string[]) => {
    const newTracks: Track[] = urls.map(url => {
      const videoId = extractYouTubeVideoId(url);
      return {
        id: Math.random().toString(36).substr(2, 9),
        url,
        title: videoId ? `YouTube: ${videoId}` : extractTitleFromUrl(url),
        type: videoId ? 'youtube' : 'audio'
      };
    });
    
    setQueue(prev => [...prev, ...newTracks]);
    
    if (currentTrackIndex === -1 && newTracks.length > 0) {
      setTimeout(() => {
        playTrack(0);
      }, 100);
    }
  }, [currentTrackIndex, playTrack]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => {
      const newQueue = prev.filter(track => track.id !== id);
      const removedIndex = prev.findIndex(track => track.id === id);
      
      if (removedIndex === currentTrackIndex) {
        if (newQueue.length > 0) {
          setCurrentTrackIndex(removedIndex >= newQueue.length ? 0 : removedIndex);
          setTimeout(() => {
            playTrack(removedIndex >= newQueue.length ? 0 : removedIndex);
          }, 100);
        } else {
          setCurrentTrackIndex(-1);
          if (howlRef.current) {
            howlRef.current.stop();
          }
        }
      } else if (removedIndex < currentTrackIndex) {
        setCurrentTrackIndex(prev => prev - 1);
      }
      
      return newQueue;
    });
  }, [currentTrackIndex, playTrack]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentTrackIndex(-1);
    if (howlRef.current) {
      howlRef.current.stop();
    }
  }, []);

  const moveTrackInQueue = (fromIndex: number, toIndex: number) => {
    setQueue(prev => {
      const newQueue = [...prev];
      const [movedTrack] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedTrack);
      
      // Update current track index if necessary
      if (currentTrackIndex === fromIndex) {
        setCurrentTrackIndex(toIndex);
      } else if (fromIndex < currentTrackIndex && toIndex >= currentTrackIndex) {
        setCurrentTrackIndex(prev => prev - 1);
      } else if (fromIndex > currentTrackIndex && toIndex <= currentTrackIndex) {
        setCurrentTrackIndex(prev => prev + 1);
      }
      
      return newQueue;
    });
  };

  const handleQueueSubmit = () => {
    const urls = queueInput.split('\n').filter(url => url.trim());
    if (urls.length > 0) {
      addToQueue(urls);
      setQueueInput('');
    }
  };



  // Audio loading function
  const loadAudio = useCallback(async () => {
    if (!inputUrl.trim()) return;

    setIsLoading(true);
    console.log('Loading audio from URL:', inputUrl);
    
    try {
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }

      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);

      const videoId = extractYouTubeVideoId(inputUrl);
      if (videoId) {
        console.log('Detected YouTube video ID:', videoId);
        setIsYouTube(true);
        setTrackTitle(t('musicPlayer.loadingYoutube', { videoId }));
        
        try {
          console.log('Loading YouTube API...');
          await loadYouTubeAPI();
          
          console.log('Creating YouTube player...');
          setTimeout(() => {
            createYouTubePlayer(videoId);
          }, 500);
          
          setAudioUrl(inputUrl);
          return;
        } catch (error) {
          console.error('YouTube API loading failed:', error);
          setIsLoading(false);
          setIsYouTube(false);
          alert(t('musicPlayer.youtubeApiError'));
          return;
        }
      } else {
        setIsYouTube(false);
      }

      console.log('Loading regular audio file...');
      const howl = new Howl({
        src: [inputUrl],
        html5: true,
        rate: playbackSpeed, // Apply playback speed
        onload: () => {
          console.log('Audio loaded successfully');
          setDuration(howl.duration());
          setTrackTitle(extractTitleFromUrl(inputUrl));
          setIsLoading(false);
        },
        onloaderror: (_id, error) => {
          console.error('Audio loading error:', error);
          setIsLoading(false);
          alert(t('musicPlayer.cannotLoadAudio'));
        },
        onplay: () => {
          console.log('Audio started playing');
          setIsPlaying(true);
        },
        onpause: () => {
          console.log('Audio paused');
          setIsPlaying(false);
        },
        onend: () => {
          console.log('Audio ended');
          setIsPlaying(false);
          setCurrentTime(0);
          
          if (repeatMode === 'one') {
            setTimeout(() => {
              togglePlayPause();
            }, 500);
          } else {
            playNext();
          }
        },
        onplayerror: (_id, error) => {
          console.error('Audio play error:', error);
          setIsPlaying(false);
          alert(t('musicPlayer.cannotPlayAudio'));
        }
      });

      howlRef.current = howl;
      setAudioUrl(inputUrl);
    } catch (error) {
      console.error('Error in loadAudio:', error);
      setIsLoading(false);
      alert(t('musicPlayer.audioLoadError'));
    }
  }, [inputUrl, volume, isMuted, repeatMode, playNext, togglePlayPause]);

  // Keyboard shortcuts - Only Space for Play/Pause
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // CRITICAL: Skip shortcuts when user is editing text (including Rich Text Editor)
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement.getAttribute('contenteditable') === 'true' ||
        activeElement.classList.contains('ql-editor') ||
        activeElement.closest('.ql-container') !== null ||
        activeElement.closest('.rich-text-editor') !== null
      );
      
      if (isEditingText) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        // Call toggle directly without using the function reference
        try {
          if (isYouTube && youtubePlayerRef.current) {
            if (isPlaying) {
              youtubePlayerRef.current.pauseVideo();
            } else {
              youtubePlayerRef.current.playVideo();
            }
          } else if (howlRef.current) {
            if (isPlaying) {
              howlRef.current.pause();
            } else {
              howlRef.current.play();
            }
          }
        } catch (error) {
          console.error('Error in space key handler:', error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, isYouTube]);

  // Update time interval
  useEffect(() => {
    if (isPlaying && !isYouTube && !isSeeking) {
      intervalRef.current = setInterval(() => {
        if (howlRef.current) {
          setCurrentTime(howlRef.current.seek());
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isYouTube, isSeeking]);

  // Mouse events for dragging and resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    const target = e.target as HTMLElement;
    
    if (target.dataset.resize) {
      e.preventDefault();
      setIsResizing(true);
      setResizeDirection(target.dataset.resize);
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: playerSize.width,
        startHeight: playerSize.height
      };
      return;
    }
    
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaY = e.clientY - dragRef.current.startY;
        
        setPosition({
          x: dragRef.current.startPosX + deltaX,
          y: dragRef.current.startPosY + deltaY
        });
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeRef.current.startX;
        const deltaY = e.clientY - resizeRef.current.startY;
        
        let newWidth = resizeRef.current.startWidth;
        let newHeight = resizeRef.current.startHeight;
        
        if (resizeDirection.includes('right')) {
          newWidth = Math.max(300, resizeRef.current.startWidth + deltaX);
        }
        if (resizeDirection.includes('left')) {
          newWidth = Math.max(300, resizeRef.current.startWidth - deltaX);
        }
        if (resizeDirection.includes('bottom')) {
          newHeight = Math.max(200, resizeRef.current.startHeight + deltaY);
        }
        if (resizeDirection.includes('top')) {
          newHeight = Math.max(200, resizeRef.current.startHeight - deltaY);
        }
        
        setPlayerSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, resizeDirection]);

  // Update YouTube container visibility when mini mode changes
  useEffect(() => {
    const container = document.getElementById('youtube-player');
    if (container && isYouTube && audioUrl) {
      // Container styles are now controlled by React state
      // No need to manually update here
      
      // If switching to mini mode and was playing, ensure YouTube continues playing
      if (miniMode && isPlaying) {
        setTimeout(() => {
          const iframe = container.querySelector('iframe');
          if (iframe) {
            // Try to ensure YouTube keeps playing by sending a play command
            iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
        }, 100);
      }
    }
  }, [miniMode, isYouTube, audioUrl, isPlaying]);

  // Load data from Firestore on mount
  useEffect(() => {
    if (auth.currentUser) {
      loadTracksFromFirestore();
      loadAlbumsFromFirestore();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Settings context
  const { isMusicPlayerEnabled } = useSettings();
  const { t } = useTranslation();
  
  // If music player is disabled in settings, don't render
  if (!isMusicPlayerEnabled) {
    return null;
  }

  return (
    <>
      {/* Mini Player */}
      {isMinimized && (
        <div
          className="fixed bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-full shadow-2xl border border-white/20 text-white px-4 py-2 z-50 select-none flex items-center gap-3"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        >
          <button
            onClick={togglePlayPause}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </button>
          
          <div className="flex-1 max-w-[200px] truncate text-sm">
            {trackTitle || 'No track playing'}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mini Mode - Hidden player but keeps playing */}
      {miniMode && (
        <div
          className="fixed top-4 right-4 bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-lg shadow-lg border border-white/20 text-white p-3 z-50"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Play/Pause"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            
            <div className="flex-1 max-w-[200px]">
              <div className="text-sm font-medium truncate">
                {trackTitle || 'No track playing'}
              </div>
              {isYouTube && (
                <div className="text-xs text-purple-200">YouTube Playing</div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMiniMode(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Show player"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden YouTube Player Container - Always present when YouTube is loaded */}
      {isYouTube && audioUrl && (
        <div
          id="youtube-player"
          style={{
            position: 'fixed',
            top: miniMode ? '4px' : '-9999px',
            right: miniMode ? '4px' : '-9999px',
            width: miniMode ? '300px' : '1px',
            height: miniMode ? '60px' : '1px',
            opacity: miniMode ? 1 : 0,
            pointerEvents: miniMode ? 'auto' : 'none',
            zIndex: 49,
            borderRadius: miniMode ? '8px' : '0',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}
        />
      )}

      {/* Main Player */}
      {!isMinimized && !miniMode && (
        <div
          ref={containerRef}
          className="fixed bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-purple-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 text-white p-4 z-50 select-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${playerSize.width}px`,
            height: `${playerSize.height}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            overflow: 'hidden'
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Resize handles */}
          <div data-resize="top" className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/10" />
          <div data-resize="bottom" className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/10" />
          <div data-resize="left" className="absolute top-0 left-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/10" />
          <div data-resize="right" className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/10" />
          <div data-resize="top-left" className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize hover:bg-white/10" />
          <div data-resize="top-right" className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize hover:bg-white/10" />
          <div data-resize="bottom-left" className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize hover:bg-white/10" />
          <div data-resize="bottom-right" className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-white/10" />
          
          {/* Content with scroll */}
          <div className="h-full overflow-y-auto" style={{ paddingRight: '8px' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isYouTube ? (
                  <Youtube className="w-5 h-5 text-red-400" />
                ) : (
                  <Music className="w-5 h-5 text-purple-300" />
                )}
                <h3 className="font-bold text-white text-sm">
                  {isYouTube ? 'YouTube Player' : 'Music Player'}
                </h3>
                {queue.length > 0 && (
                  <span className="text-xs bg-purple-600/50 px-2 py-1 rounded-full">
                    {queue.length} tracks
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowUploadSection(!showUploadSection)}
                  className={`p-1.5 rounded-lg transition-colors ${showUploadSection ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Upload audio"
                >
                  <Upload className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => setMiniMode(true)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Hide player (keep playing)"
                >
                  <Minimize2 className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`p-1.5 rounded-lg transition-colors ${showQueue ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Toggle queue"
                >
                  <List className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => setShowAlbums(!showAlbums)}
                  className={`p-1.5 rounded-lg transition-colors ${showAlbums ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Show albums"
                >
                  <FolderOpen className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Show history"
                >
                  <History className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Minimize"
                >
                  <Minimize2 className="w-3 h-3" />
                </button>
                
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Current Track Info */}
            {(trackTitle || queue.length > 0) && (
              <div className="mb-4">
                <div className="text-sm font-medium text-white truncate mb-1">
                  {trackTitle || 'No track playing'}
                </div>
                {queue.length > 0 && (
                  <div className="text-xs text-purple-200">
                    {currentTrackIndex + 1} / {queue.length} in queue
                  </div>
                )}
              </div>
            )}

            {/* URL Input Section */}
            <div className="mb-4">
              <div className="space-y-2">
                {/* Web URL input */}
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder={t('musicPlayer.urlPlaceholderInput')}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all text-sm"
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputUrl.trim()) {
                      loadAudio();
                    }
                  }}
                />
                
                <button
                  onClick={loadAudio}
                  disabled={isLoading || !inputUrl.trim()}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('musicPlayer.loading')}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {t('musicPlayer.addUrlToQueue')}
                    </>
                  )}
                </button>
              </div>
              
              <div className="text-xs text-purple-200 p-2 bg-white/5 rounded-lg mt-2">
                <div className="font-semibold mb-1">{t('musicPlayer.support')}</div>
                <div>• {t('musicPlayer.youtubeUrls')}</div>
                <div>• {t('musicPlayer.audioWeb')}</div>
                <div>• {t('musicPlayer.urlFromWeb')}</div>
                <div className="mt-1 font-semibold">• {t('musicPlayer.shortcutSpace')}</div>
              </div>
            </div>

            {/* Upload Section */}
            {showUploadSection && (
              <div className="mb-4 p-3 bg-white/5 rounded-xl">
                <h4 className="text-sm font-semibold text-white mb-3">{t('musicPlayer.addMusic')}</h4>
                
                {/* File Upload */}
                <div className="mb-3">
                  <label className="text-xs text-purple-200 mb-1 block">{t('musicPlayer.customSongName')}</label>
                  <input
                    type="text"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    placeholder={t('musicPlayer.customSongPlaceholder')}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 text-sm mb-2"
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 50 * 1024 * 1024) { // 50MB limit
                          alert(t('musicPlayer.fileTooLarge'));
                          return;
                        }
                        uploadAudioFile(file, uploadFileName);
                      }
                    }}
                    disabled={isUploading}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer disabled:opacity-50"
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </div>
                
                {isUploading && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-purple-200 mb-1">
                      <span>{t('musicPlayer.uploading')}</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* URL Input */}
                <div className="mb-3 pt-3 border-t border-white/10">
                  <label className="text-xs text-purple-200 mb-1 block">{t('musicPlayer.addFromUrl')}</label>
                  <input
                    type="text"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder={t('musicPlayer.urlPlaceholder')}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 text-sm mb-2"
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={addUrlToQueue}
                    disabled={!uploadUrl.trim()}
                    className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Plus className="w-4 h-4" />
                    {t('musicPlayer.addUrlToQueue')}
                  </button>
                </div>
                
                <div className="text-xs text-purple-200 bg-white/5 rounded p-2">
                  <div className="font-semibold mb-1">{t('musicPlayer.support')}</div>
                  • {t('musicPlayer.supportFile')}
                  <br />
                  • {t('musicPlayer.supportUrl')}
                </div>
              </div>
            )}

            {/* Player Controls */}
            {audioUrl && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-purple-200 mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    onMouseDown={handleSeekStart}
                    onMouseUp={handleSeekEnd}
                    onTouchStart={handleSeekStart}
                    onTouchEnd={handleSeekEnd}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #9333ea 0%, #9333ea ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`
                    }}
                  />
                </div>

                <div className="flex items-center justify-center gap-2 mb-4">
                  <button
                    onClick={skipBackward}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                    title={queue.length > 0 && currentTime > 3 ? "Restart" : "Previous"}
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={togglePlayPause}
                    className="p-3 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  
                  <button
                    onClick={skipForward}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                    title={queue.length > 0 ? "Next" : "Forward 10s"}
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowSpeedControl(!showSpeedControl)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      onMouseDown={(e) => e.stopPropagation()}
                      title="Playback speed"
                    >
                      <Gauge className="w-4 h-4" />
                    </button>
                    
                    {showSpeedControl && (
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 rounded-lg p-2 shadow-xl border border-white/20 whitespace-nowrap z-50">
                        <div className="text-xs text-purple-200 mb-2 text-center">{t('musicPlayer.speed', { speed: playbackSpeed })}</div>
                        <div className="flex gap-1">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                            <button
                              key={speed}
                              onClick={() => {
                                changePlaybackSpeed(speed);
                                setShowSpeedControl(false);
                              }}
                              className={`px-2 py-1 rounded text-xs transition-colors ${
                                playbackSpeed === speed 
                                  ? 'bg-purple-600 text-white' 
                                  : 'bg-white/10 hover:bg-white/20 text-white'
                              }`}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}
                    className={`p-2 rounded-full transition-colors ${
                      repeatMode !== 'off' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'
                    }`}
                    onMouseDown={(e) => e.stopPropagation()}
                    title={`Repeat: ${repeatMode}`}
                  >
                    <Repeat className="w-4 h-4" />
                    {repeatMode === 'one' && (
                      <span className="absolute -top-1 -right-1 text-xs bg-purple-700 rounded-full w-4 h-4 flex items-center justify-center">1</span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #9333ea 0%, #9333ea ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <span className="text-xs text-purple-200 w-10 text-right">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              </>
            )}

            {/* Queue Section */}
            {showQueue && (
              <div className="mb-4 p-3 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">Queue ({queue.length})</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIsShuffle(!isShuffle)}
                      className={`p-1.5 rounded-lg transition-colors ${isShuffle ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                      onMouseDown={(e) => e.stopPropagation()}
                      title="Shuffle"
                    >
                      <Shuffle className="w-3 h-3" />
                    </button>
                    {queue.length > 0 && (
                      <button
                        onClick={clearQueue}
                        className="p-1.5 rounded-lg bg-red-600/50 hover:bg-red-600/70 transition-colors"
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Clear queue"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Search */}
                <div className="mb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-purple-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('musicPlayer.searchPlaceholder')}
                      className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 text-xs"
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                <div className="mb-2">
                  <textarea
                    value={queueInput}
                    onChange={(e) => setQueueInput(e.target.value)}
                    placeholder={t('musicPlayer.pasteUrls')}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all text-xs resize-none"
                    rows={3}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={handleQueueSubmit}
                    disabled={!queueInput.trim()}
                    className="mt-2 w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-xs"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    Add to Queue
                  </button>
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filterTracks(queue).map((track) => {
                    const originalIndex = queue.findIndex(t => t.id === track.id);
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                          originalIndex === currentTrackIndex ? 'bg-purple-600/30' : 'bg-white/5 hover:bg-white/10'
                        }`}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div className="flex-1 min-w-0">
                          {editingTrackId === track.id ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveTrackTitle(track.id);
                                  if (e.key === 'Escape') {
                                    setEditingTrackId(null);
                                    setEditingTitle('');
                                  }
                                }}
                                className="flex-1 px-2 py-1 bg-white/20 border border-white/30 rounded text-white text-xs"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={() => saveTrackTitle(track.id)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                              >
                                ✓
                              </button>
                            </div>
                          ) : (
                            <div onClick={() => playTrack(originalIndex)} className="cursor-pointer">
                              <div className="font-medium text-white truncate">{track.title}</div>
                              <div className="text-purple-200 flex items-center gap-1">
                                <span>{track.type}</span>
                                {track.type === 'uploaded' && track.fileSize && (
                                  <span>• {(track.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingTrack(track);
                            }}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {originalIndex > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTrackInQueue(originalIndex, originalIndex - 1);
                              }}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                          {originalIndex < queue.length - 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTrackInQueue(originalIndex, originalIndex + 1);
                              }}
                              className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                              title="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          )}
                          {track.type === 'uploaded' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(t('musicPlayer.confirmDeleteFromStorage'))) {
                                  deleteUploadedTrack(track);
                                }
                              }}
                              className="p-1 rounded bg-red-600/50 hover:bg-red-600/70 transition-colors"
                              title={t('musicPlayer.deleteFromStorage')}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromQueue(track.id);
                            }}
                            className="p-1 rounded bg-red-600/50 hover:bg-red-600/70 transition-colors"
                            title="Remove from queue"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filterTracks(queue).length === 0 && (
                    <div className="text-center text-purple-200 py-4">
                      {queue.length === 0 ? 'Queue is empty. Add some tracks!' : 'No matching tracks'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History Section */}
            {showHistory && (
              <div className="mb-4 p-3 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">History ({history.length})</h4>
                  {history.length > 0 && (
                    <button
                      onClick={() => setHistory([])}
                      className="p-1.5 rounded-lg bg-red-600/50 hover:bg-red-600/70 transition-colors text-xs"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {history.map((track, index) => (
                    <div
                      key={`${track.id}-${index}`}
                      className="flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
                      onClick={() => {
                        setInputUrl(track.url);
                        setIsYouTube(track.type === 'youtube');
                        setTimeout(() => loadAudio(), 100);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Clock className="w-3 h-3 text-purple-300" />
                      <div className="flex-1 truncate">
                        <div className="font-medium text-white">{track.title}</div>
                        <div className="text-purple-200">{track.type}</div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center text-purple-200 py-4">
                      No history yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Albums Section */}
            {showAlbums && (
              <div className="mb-4 p-3 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">Albums ({albums.length})</h4>
                </div>
                
                {/* Create new album from current queue */}
                {queue.length > 0 && (
                  <div className="mb-2 space-y-2">
                    <input
                      type="text"
                      value={albumName}
                      onChange={(e) => setAlbumName(e.target.value)}
                      placeholder={t('musicPlayer.albumName')}
                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 text-xs"
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                    <input
                      type="text"
                      value={albumDescription}
                      onChange={(e) => setAlbumDescription(e.target.value)}
                      placeholder={t('musicPlayer.albumDescription')}
                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 text-xs"
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={saveAlbum}
                      disabled={!albumName.trim()}
                      className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 rounded text-xs transition-colors flex items-center justify-center gap-1"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Save className="w-3 h-3" />
                      {t('musicPlayer.saveAlbum', { count: queue.length })}
                    </button>
                  </div>
                )}
                
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {albums.map((album) => (
                    <div
                      key={album.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                        currentAlbum?.id === album.id ? 'bg-purple-600/30' : 'bg-white/5 hover:bg-white/10'
                      }`}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <FolderOpen className="w-3 h-3 text-purple-300 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{album.name}</div>
                        <div className="text-purple-200 text-xs">
                          {t('musicPlayer.tracksCount', { count: album.tracks.length })}
                          {album.description && ` • ${album.description.slice(0, 20)}${album.description.length > 20 ? '...' : ''}`}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => loadAlbum(album)}
                          className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                          title="Load album"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(t('musicPlayer.confirmDeleteAlbum'))) {
                              deleteAlbum(album.id);
                            }
                          }}
                          className="p-1 rounded bg-red-600/50 hover:bg-red-600/70 transition-colors"
                          title="Delete album"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {albums.length === 0 && (
                    <div className="text-center text-purple-200 py-4">
                      {t('musicPlayer.noAlbums')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No track message */}
            {!audioUrl && queue.length === 0 && (
              <div className="text-center text-purple-200 py-8">
                <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No tracks loaded</div>
                <div className="text-xs mt-1">Add URLs to start playing</div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </>
  );
};

export default MusicPlayer;
