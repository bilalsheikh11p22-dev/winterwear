import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Truck, RotateCcw, Award, ArrowUpRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-charcoal-dark border-t border-white/10 text-silver text-xs">
      {/* Brand Value Pillars */}
      <div className="border-b border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-charcoal border border-white/5 text-ice">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-snow font-medium text-sm tracking-wide">Heritage Craftsmanship</h4>
              <p className="text-silver-dark text-xs mt-0.5">Biella wool mills & 850+ fill goose down</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-charcoal border border-white/5 text-ice">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-snow font-medium text-sm tracking-wide">Global Express Shipping</h4>
              <p className="text-silver-dark text-xs mt-0.5">Complimentary delivery on orders over $300</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-charcoal border border-white/5 text-ice">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-snow font-medium text-sm tracking-wide">Effortless Returns</h4>
              <p className="text-silver-dark text-xs mt-0.5">30-day atelier return window</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-charcoal border border-white/5 text-ice">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-snow font-medium text-sm tracking-wide">Certified Integrity</h4>
              <p className="text-silver-dark text-xs mt-0.5">RDS ethically certified down & traceable wool</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-5 gap-10">
        {/* Brand Statement Col */}
        <div className="md:col-span-2 space-y-4">
          <span className="font-editorial-display text-2xl tracking-editorial font-bold text-snow block">
            WINTERWEAR
          </span>
          <p className="text-silver-light max-w-sm leading-relaxed text-xs">
            Architectural silhouettes built for severe cold. Merging European sartorial tailoring with high-altitude technical insulation. Designed to endure decades of winter storms.
          </p>
          <div className="pt-2">
            <span className="text-[10px] uppercase tracking-widest text-cream font-bold block mb-1">
              Atelier & Flagship Concierge
            </span>
            <p className="text-silver-dark">concierge@winterwear.fashion • +1 (800) 492-WNTW</p>
          </div>
        </div>

        {/* Collections */}
        <div className="space-y-3">
          <h4 className="font-bold text-snow tracking-wider uppercase text-xs">Collections</h4>
          <ul className="space-y-2">
            <li><Link to="/shop?collection=Men's Collection" className="hover:text-cream transition-colors">Men's Outerwear</Link></li>
            <li><Link to="/shop?collection=Women's Collection" className="hover:text-cream transition-colors">Women's Outerwear</Link></li>
            <li><Link to="/shop?category=puffer-jackets" className="hover:text-cream transition-colors">Goose Down Puffers</Link></li>
            <li><Link to="/shop?category=wool-coats" className="hover:text-cream transition-colors">Cashmere & Wool Overcoats</Link></li>
            <li><Link to="/shop?category=leather-jackets" className="hover:text-cream transition-colors">Merino Shearling Aviators</Link></li>
            <li><Link to="/shop?category=mufflers-scarves" className="hover:text-cream transition-colors">Scarves & Winter Accents</Link></li>
          </ul>
        </div>

        {/* Client Concierge */}
        <div className="space-y-3">
          <h4 className="font-bold text-snow tracking-wider uppercase text-xs">Client Care</h4>
          <ul className="space-y-2">
            <li><Link to="/size-guide" className="hover:text-cream transition-colors">Bespoke Size Guide</Link></li>
            <li><Link to="/order-tracking" className="hover:text-cream transition-colors">Track Real-Time Order</Link></li>
            <li><Link to="/shipping-policy" className="hover:text-cream transition-colors">Shipping & Global Freight</Link></li>
            <li><Link to="/returns-policy" className="hover:text-cream transition-colors">Returns & Atelier Exchange</Link></li>
            <li><Link to="/faq" className="hover:text-cream transition-colors">Frequently Asked Questions</Link></li>
            <li><Link to="/contact" className="hover:text-cream transition-colors">Atelier Direct Contact</Link></li>
          </ul>
        </div>

        {/* Four Operational Portals & Legal */}
        <div className="space-y-3">
          <h4 className="font-bold text-snow tracking-wider uppercase text-xs">Operational Portals</h4>
          <ul className="space-y-2">
            <li>
              <Link to="/login?role=admin" className="hover:text-ice transition-colors flex items-center gap-1">
                <span>Super Admin Panel</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </li>
            <li>
              <Link to="/login?role=inventory" className="hover:text-ice transition-colors flex items-center gap-1">
                <span>Warehouse Hub</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </li>
            <li>
              <Link to="/login?role=rider" className="hover:text-ice transition-colors flex items-center gap-1">
                <span>Rider Dispatch Portal</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </li>
            <li>
              <Link to="/privacy-policy" className="hover:text-cream transition-colors">Privacy Charter</Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-cream transition-colors">Terms of Haute Service</Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Payment methods & Copyright */}
      <div className="border-t border-white/5 py-8 bg-charcoal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-silver-dark text-center md:text-left">
            © {new Date().getFullYear()} WinterWear Atelier Inc. All rights reserved. High-performance tailoring for extreme winters.
          </div>
          <div className="flex items-center gap-3 text-[10px] text-silver-dark uppercase tracking-widest font-mono">
            <span className="px-2 py-1 bg-charcoal-surface rounded border border-white/5">Stripe Verified</span>
            <span className="px-2 py-1 bg-charcoal-surface rounded border border-white/5">Safepay Verified</span>
            <span className="px-2 py-1 bg-charcoal-surface rounded border border-white/5">Cash on Delivery</span>
            <span className="px-2 py-1 bg-charcoal-surface rounded border border-white/5">TLS 256-Bit</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
