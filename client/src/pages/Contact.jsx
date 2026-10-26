import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-charcoal text-snow py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-editorial text-ice font-bold">
            Atelier Concierge
          </span>
          <h1 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light">
            Direct Atelier Inquiries
          </h1>
          <p className="text-xs text-silver max-w-md mx-auto">
            Our client advisors and tailoring specialists are at your service for sizing consultations, bespoke orders, and order inquiries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Atelier Details */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded border border-white/5 space-y-4">
              <h3 className="font-editorial-serif text-xl text-snow font-medium">Flagship Ateliers</h3>
              <div className="space-y-3 text-xs text-silver">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-cream shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-snow block">Zurich Atelier</strong>
                    <span>Bahnhofstrasse 48, 8001 Zürich, Switzerland</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-cream shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-snow block">Lahore Heritage Hub</strong>
                    <span>Gulberg III, Industrial Design Quarter, Lahore, Pakistan</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-cream shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-snow block">Telephone Concierge</strong>
                    <span>+1 (800) 492-WNTW (Mon - Sat, 9am - 8pm GMT)</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-cream shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-snow block">Digital Inquiries</strong>
                    <span>concierge@winterwear.fashion</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inquiry Form */}
          <div className="glass-panel p-8 rounded border border-white/10">
            {submitted ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-cream/10 text-cream mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-editorial-serif text-2xl text-snow font-medium">Inquiry Dispatched</h4>
                <p className="text-xs text-silver">
                  An atelier advisor will reply to your communication within 12 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-silver mb-1 font-semibold">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Marcus Sterling"
                    className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-cream"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-silver mb-1 font-semibold">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="marcus@example.com"
                    className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-cream"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-silver mb-1 font-semibold">
                    Message or Tailoring Query
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Specify sizing inquiry, stock availability, or bespoke service..."
                    className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-cream"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
