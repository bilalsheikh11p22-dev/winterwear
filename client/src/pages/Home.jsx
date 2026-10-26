import React from 'react';
import CinematicHero from '../components/home/CinematicHero';
import HorizontalProductGallery from '../components/animations/HorizontalProductGallery';
import CampaignBanners from '../components/home/CampaignBanners';
import CinematicScene from '../components/animations/CinematicScene';
import FeaturedCollections from '../components/home/FeaturedCollections';
import TestimonialsSection from '../components/home/TestimonialsSection';
import NewsletterSection from '../components/home/NewsletterSection';
import LatestArrivals from '../components/notifications/LatestArrivals';

const Home = () => {
  return (
    <main className="overflow-hidden">
      {/* 1. Cinematic Hero with Video & Staggered Reveal */}
      <CinematicHero />

      {/* 2. Horizontal Product Gallery (Desktop Scrub, Mobile Touch Swipe) */}
      <HorizontalProductGallery />

      {/* 3. Winter Campaign Banners with Clip-Path Reveal */}
      <CampaignBanners />

      {/* 4. Short Pinned Brand-Story Scene */}
      <CinematicScene />

      {/* 5. Signature Collections (New Arrivals, Best Sellers, Jackets, Sale) */}
      <FeaturedCollections />

      {/* 5b. Latest arrivals — live from GET /products/latest */}
      <LatestArrivals />

      {/* 6. Verified Patron Reviews */}
      <TestimonialsSection />

      {/* 7. Final Promotional Gazette CTA */}
      <NewsletterSection />
    </main>
  );
};

export default Home;
