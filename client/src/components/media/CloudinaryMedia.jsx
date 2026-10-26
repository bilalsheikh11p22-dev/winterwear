import React, { useState, useRef, useEffect } from 'react';
import { getOptimizedMediaUrl } from '../../config/cloudinary';
import { Volume2, VolumeX, Play, Pause, AlertCircle } from 'lucide-react';

/**
 * CloudinaryMedia Component
 * Manages Cloudinary or CDN media with:
 * - Automatic pause when off-screen via IntersectionObserver
 * - Video poster fallback and error handling
 * - Lazy-loading and graceful clip-path / fade entrance
 * - User mute/play controls when enabled
 */
export const CloudinaryMedia = ({
  type = 'image', // 'image' | 'video'
  src,
  poster,
  alt = 'WinterWear Media',
  className = '',
  controls = false,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  aspectRatio = 'aspect-[16/9]',
  transformationOptions = {},
  onLoaded,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const optimizedSrc = getOptimizedMediaUrl(src, transformationOptions);
  const optimizedPoster = getOptimizedMediaUrl(poster, { width: 1200, quality: 'auto' });

  // IntersectionObserver: Pause video when scrolled out of view to preserve resources
  useEffect(() => {
    if (type !== 'video' || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              if (isPlaying) {
                videoRef.current.play().catch(() => {
                  // Autoplay policy prevented playback without interaction
                });
              }
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [type, isPlaying]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${aspectRatio} ${className} bg-charcoal-surface`}
    >
      {type === 'video' ? (
        <>
          <video
            ref={videoRef}
            src={optimizedSrc}
            poster={optimizedPoster}
            autoPlay={autoPlay}
            loop={loop}
            muted={isMuted}
            playsInline={playsInline}
            onLoadedData={() => {
              setIsLoaded(true);
              onLoaded?.();
            }}
            onError={() => {
              setHasError(true);
            }}
            className={`w-full h-full object-cover object-center transition-opacity duration-700 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Fallback image if video fails to load */}
          {hasError && poster && (
            <img
              src={optimizedPoster}
              alt={alt}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          )}

          {/* Video Controls Overlay */}
          {controls && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 rounded-full glass-panel text-snow hover:text-cream transition-transform hover:scale-105"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="p-2 rounded-full glass-panel text-snow hover:text-cream transition-transform hover:scale-105"
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </>
      ) : (
        <img
          src={optimizedSrc}
          alt={alt}
          loading="lazy"
          onLoad={() => {
            setIsLoaded(true);
            onLoaded?.();
          }}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover object-center transition-all duration-700 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        />
      )}

      {hasError && !poster && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-charcoal text-silver text-xs">
          <AlertCircle className="w-6 h-6 mb-2 text-silver-dark" />
          <span>Atelier media preview standby</span>
        </div>
      )}
    </div>
  );
};

export default CloudinaryMedia;
