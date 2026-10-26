import React, { useState } from 'react';
import { Mail, Check, ArrowRight } from 'lucide-react';

const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!consent) {
      setErrorMsg('Please indicate consent to receive editorial updates.');
      return;
    }

    setErrorMsg('');
    setIsSubmitted(true);
  };

  return (
    <section className="py-24 bg-charcoal-dark border-b border-white/5 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs uppercase tracking-editorial text-cream font-bold">
          The Winterwear Gazette
        </span>
        <h2 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light mt-2">
          Atelier Releases & Private Invitations
        </h2>
        <p className="mt-4 text-xs sm:text-sm text-silver max-w-xl mx-auto leading-relaxed font-light">
          Subscribe to receive early access to our limited runway capsules, private archive sales, and bespoke tailoring announcements.
        </p>

        {isSubmitted ? (
          <div className="mt-10 p-6 glass-panel rounded-sm border border-cream/30 max-w-md mx-auto animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-cream/10 text-cream mx-auto flex items-center justify-center mb-3">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="font-editorial-serif text-xl text-snow font-medium">Welcome to the Gazette</h4>
            <p className="text-xs text-silver mt-1">
              Check your inbox shortly. Your 10% private welcoming code is <strong className="text-cream">LUXURY10</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 max-w-md mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-silver" />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-charcoal text-snow text-xs pl-11 pr-4 py-3.5 rounded-sm border border-white/10 focus:outline-none focus:border-cream/60 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 bg-cream hover:bg-snow text-charcoal font-bold text-xs uppercase tracking-widest rounded-sm transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>Join</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start gap-2 text-left pt-2">
              <input
                id="newsletter-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded bg-charcoal border-white/20 text-burgundy focus:ring-burgundy"
              />
              <label htmlFor="newsletter-consent" className="text-[11px] text-silver-dark leading-tight">
                I agree to receive curated updates and private invitations. You may revoke consent anytime.
              </label>
            </div>

            {errorMsg && (
              <p className="text-xs text-burgundy-light font-medium text-left">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </section>
  );
};

export default NewsletterSection;
