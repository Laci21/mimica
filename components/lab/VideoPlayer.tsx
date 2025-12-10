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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setIsLoading(false);
      setError(null);
      if (onDurationChange) {
        onDurationChange(dur);
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      setError(null);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    const handleError = () => {
      setIsLoading(false);
      const videoError = video.error;
      if (videoError) {
        let errorMessage = 'Video failed to load';
        switch (videoError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading video';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video codec not supported or video corrupted';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported by your browser';
            break;
        }
        setError(errorMessage);
        console.error('Video error:', videoError);
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
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

  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (err) {
      console.error('Error playing video:', err);
      setError('Failed to play video. The video format may not be supported.');
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
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-white text-center">
              <div className="animate-spin text-4xl mb-2">⏳</div>
              <p className="text-sm">Loading video...</p>
            </div>
          </div>
        )}
        
        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-white font-medium mb-2">Video Error</p>
              <p className="text-white/70 text-sm mb-3">{error}</p>
              <details className="text-left bg-black/40 rounded-lg p-3 mb-3">
                <summary className="text-white/90 text-xs cursor-pointer mb-2">
                  Troubleshooting Tips
                </summary>
                <ul className="text-white/70 text-xs space-y-1 list-disc list-inside">
                  <li>Check if the video file exists on the backend</li>
                  <li>Try using Chrome/Edge (better WebM codec support)</li>
                  <li>Check browser console for detailed errors</li>
                  <li>Ensure the run completed successfully</li>
                </ul>
              </details>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="px-4 py-2 bg-accent hover:bg-accent-light rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
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

