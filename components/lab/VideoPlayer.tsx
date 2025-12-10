/**
 * VideoPlayer Component
 * 
 * HTML5 video player with custom controls for replay viewing
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import { formatTime } from '@/lib/replay/sync';

interface VideoPlayerProps {
  videoUrl: string;
  onTimeUpdate: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  seekToTime?: number;
  variant?: 'default' | 'compact';
}

export default function VideoPlayer({ 
  videoUrl, 
  onTimeUpdate, 
  onDurationChange,
  seekToTime,
  variant = 'default'
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);

  // Handle time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      if (!isSeeking) {
        onTimeUpdate(time);
      }
    };

    const handleLoadedMetadata = () => {
      const dur = video.duration;
      setDuration(dur);
      if (onDurationChange) {
        onDurationChange(dur);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onTimeUpdate, onDurationChange, isSeeking]);

  // Handle external seek requests
  useEffect(() => {
    const video = videoRef.current;
    if (!video || seekToTime === undefined) return;
    
    // Only seek if the time difference is significant (> 0.5s)
    if (Math.abs(video.currentTime - seekToTime) > 0.5) {
      video.currentTime = seekToTime;
    }
  }, [seekToTime]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    onTimeUpdate(time);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
  };

  const changePlaybackSpeed = () => {
    const video = videoRef.current;
    if (!video) return;

    const speeds = [0.5, 1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    
    video.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.currentTime + 5, duration);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(video.currentTime - 5, 0);
  };

  const isCompact = variant === 'compact';
  
  return (
    <div className={isCompact ? "flex flex-col gap-0.5" : "flex flex-col gap-3"}>
      {/* Video Display */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full"
          preload="metadata"
        />
      </div>

      {/* Custom Controls */}
      <div className={isCompact ? "space-y-0.5" : "space-y-3"}>
        {/* Seek Bar */}
        <div className="px-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchEnd={handleSeekEnd}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
            style={{
              background: `linear-gradient(to right, rgb(var(--accent)) 0%, rgb(var(--accent)) ${(currentTime / duration) * 100}%, rgb(var(--border)) ${(currentTime / duration) * 100}%, rgb(var(--border)) 100%)`
            }}
          />
          <div className={`flex justify-between text-foreground/50 mt-0.5 ${isCompact ? 'text-xs' : 'text-xs'}`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className={`flex items-center justify-between ${isCompact ? 'gap-1.5' : 'gap-2'}`}>
          <div className={`flex items-center ${isCompact ? 'gap-1.5' : 'gap-2'}`}>
            {/* Skip Backward */}
            <button
              onClick={skipBackward}
              className={`bg-surface hover:bg-surface-light border border-border rounded transition-colors ${isCompact ? 'px-2 py-0.5 text-sm' : 'px-3 py-2'}`}
              title="Skip backward 5s"
            >
              ⏪
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className={`bg-accent hover:bg-accent-light rounded font-medium transition-colors ${isCompact ? 'px-3 py-0.5 text-sm' : 'px-4 py-2'}`}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            {/* Skip Forward */}
            <button
              onClick={skipForward}
              className={`bg-surface hover:bg-surface-light border border-border rounded transition-colors ${isCompact ? 'px-2 py-0.5 text-sm' : 'px-3 py-2'}`}
              title="Skip forward 5s"
            >
              ⏩
            </button>
          </div>

          {/* Playback Speed */}
          <button
            onClick={changePlaybackSpeed}
            className={`bg-surface hover:bg-surface-light border border-border rounded font-medium transition-colors ${isCompact ? 'px-2 py-0.5 text-xs' : 'px-3 py-2 text-sm'}`}
            title="Change playback speed"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>
    </div>
  );
}

