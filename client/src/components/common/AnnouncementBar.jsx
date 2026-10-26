import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const AnnouncementBar = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <aside aria-label="Seasonal announcement" className="relative bg-burgundy text-snow text-[10px] sm:text-xs tracking-wide sm:tracking-widest uppercase font-medium py-1.5 sm:py-2 px-3 sm:px-4 transition-all duration-300 z-50 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex-1 text-center flex items-center justify-center gap-2">
          <Sparkles className="hidden sm:block w-3.5 h-3.5 text-ice animate-pulse" />
          <span className="sm:hidden leading-snug">
            Free shipping over $300 • Code{' '}
            <strong className="underline underline-offset-2 font-bold tracking-normal">WINTER20</strong> = 20% off
          </span>
          <span className="hidden sm:inline">
            Winter Solstice Edition: Complimentary Global Shipping Over $300 • Use Code{' '}
            <strong className="underline underline-offset-2 font-bold tracking-normal">WINTER20</strong> For 20% Off
          </span>
          <Link
            to="/shop?filter=sale"
            className="hidden md:inline-block ml-2 text-ice hover:text-white underline font-semibold transition-colors"
          >
            Explore Sale →
          </Link>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-snow/70 hover:text-snow transition-colors p-1"
          aria-label="Dismiss announcement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};

export default AnnouncementBar;
