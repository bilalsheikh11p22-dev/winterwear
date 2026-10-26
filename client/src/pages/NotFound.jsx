import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-charcoal text-snow flex items-center justify-center py-20 px-4">
      <div className="text-center max-w-md space-y-6">
        <span className="font-editorial-display text-8xl text-cream font-bold block">
          404
        </span>
        <h1 className="font-editorial-serif text-3xl text-snow font-light">
          Out of Archive Orbit
        </h1>
        <p className="text-xs text-silver leading-relaxed">
          The requested page or collection does not exist in our catalog archive. Explore our latest winter arrivals or return to the main salon.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded transition-all duration-300 shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Salon</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
