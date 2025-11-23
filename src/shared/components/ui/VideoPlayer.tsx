/**
 * 🎬 VideoPlayer Component
 * Plays both YouTube videos and direct video files
 */

import React from 'react';
import { isYouTubeUrl, getYouTubeEmbedUrl } from '../../../utils/videoUtils';

interface VideoPlayerProps {
  url: string;
  className?: string;
  style?: React.CSSProperties;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  className = '',
  style,
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  onClick,
}) => {
  // Check if YouTube video
  if (isYouTubeUrl(url)) {
    const embedUrl = getYouTubeEmbedUrl(url);
    if (!embedUrl) {
      return (
        <div className={`bg-gray-100 dark:bg-gray-800 p-4 rounded-lg ${className}`}>
          <p className="text-red-500 text-sm">Invalid YouTube URL</p>
        </div>
      );
    }

    return (
      <div className={`relative ${className}`} style={style} onClick={onClick}>
        <iframe
          src={`${embedUrl}?autoplay=${autoPlay ? 1 : 0}&muted=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&controls=${controls ? 1 : 0}`}
          className="w-full rounded-lg"
          style={{ height: style?.maxHeight || '300px', ...style }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video player"
        />
      </div>
    );
  }

  // Regular video file
  return (
    <video
      src={url}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      className={`rounded-lg ${className}`}
      style={style}
      onClick={onClick}
    >
      Your browser does not support the video tag.
    </video>
  );
};

export default VideoPlayer;
