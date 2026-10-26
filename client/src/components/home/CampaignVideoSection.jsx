import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { campaignApi } from '../../services/api';

const CampaignVideoSection = () => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);

  const [campaignData, setCampaignData] = useState({
    title: 'The Northern Ridge Cinema',
    headline: 'Cinematic Fashion in Extreme Alpine Elements',
    description: 'Witness the WinterWear Haute Outerwear campaign shot on location across the snowbound fjords of Tromsø and Lyngen Alps.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-winter-fashion-model-in-snow-40611-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?q=80&w=2000&auto=format&fit=crop',
    link: '/shop',
  });

  useEffect(() => {
    let isMounted = true;
    campaignApi
      .getPublicCampaigns({ section: 'promotional_editorial' })
      .then((res) => {
        if (!isMounted) return;
        const camp = res.data.data?.[0];
        if (camp) {
          setCampaignData((prev) => ({
            ...prev,
            title: camp.title || prev.title,
            headline: camp.headline || prev.headline,
            description: camp.description || prev.description,
            videoUrl: camp.video?.secureUrl || camp.heroMedia?.url || prev.videoUrl,
            posterUrl: camp.video?.posterUrl || camp.heroMedia?.posterUrl || prev.posterUrl,
            link: `/shop`,
          }));
        }
      })
      .catch(() => {
        // Fallback preserved
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section className="relative h-[80vh] min-h-[550px] w-full overflow-hidden bg-charcoal">
      {/* Video Background / Fallback */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          poster={campaignData.posterUrl}
          className="w-full h-full object-cover object-center filter brightness-50"
        >
          <source src={campaignData.videoUrl} type="video/mp4" />
        </video>
        {/* Dark cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-charcoal/80" />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Floating Controls Top Right */}
      <div className="absolute top-8 right-8 z-20 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="p-3 rounded-full glass-panel text-snow hover:text-cream transition-transform hover:scale-105"
          aria-label={isPlaying ? 'Pause film' : 'Play film'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button
          onClick={toggleMute}
          className="p-3 rounded-full glass-panel text-snow hover:text-cream transition-transform hover:scale-105"
          aria-label={isMuted ? 'Unmute film audio' : 'Mute film audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Content Center */}
      <div className="relative z-10 flex flex-col justify-end h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="max-w-2xl space-y-4">
          <span className="text-xs uppercase tracking-editorial text-ice font-bold">
            {campaignData.title}
          </span>
          <h2 className="font-editorial-serif text-3xl sm:text-5xl md:text-6xl text-snow font-light leading-tight">
            {campaignData.headline}
          </h2>
          <p className="text-silver text-sm sm:text-base font-light max-w-xl leading-relaxed">
            {campaignData.description}
          </p>
          <div className="pt-4">
            <Link
              to={campaignData.link}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-burgundy hover:bg-burgundy-light text-snow text-xs uppercase tracking-widest font-semibold rounded-sm transition-all shadow-xl hover:scale-105"
            >
              <span>Explore The Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CampaignVideoSection;
