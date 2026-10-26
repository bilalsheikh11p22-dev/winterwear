import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const PolicyPage = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Atelier Policies';
  let subtitle = 'Our legal and operational commitments to discerning patrons.';

  if (path.includes('shipping')) {
    title = 'Shipping & International Freight Policy';
    subtitle = 'Complimentary global express logistics on all orders exceeding $300.';
  } else if (path.includes('return')) {
    title = 'Returns, Refunds & Size Exchange Policy';
    subtitle = '30-day window for unworn items with original security tags and garment bags.';
  } else if (path.includes('privacy')) {
    title = 'Privacy Charter & Data Governance';
    subtitle = 'Zero marketing data trading. Encrypted TLS 256-bit storage.';
  } else if (path.includes('terms')) {
    title = 'Terms of Atelier Service';
    subtitle = 'Conditions governing bespoke fashion purchases, warranty, and authentic origin.';
  }

  return (
    <div className="min-h-screen bg-charcoal text-snow py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div>
          <span className="text-xs uppercase tracking-editorial text-ice font-bold">
            Legal & Operational Charter
          </span>
          <h1 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light mt-1">
            {title}
          </h1>
          <p className="text-xs text-silver mt-2">{subtitle}</p>
        </div>

        <div className="glass-panel p-8 rounded border border-white/10 space-y-6 text-xs text-silver leading-relaxed font-light">
          <div>
            <h3 className="font-bold text-snow uppercase tracking-wider text-sm mb-2">
              1. Scope & Verification
            </h3>
            <p>
              WinterWear guarantees 100% authenticity for all pieces produced across our certified Italian and Portuguese partner workshops. Every coat bears a tamper-evident serial identifier cross-referenced against our central inventory database.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-snow uppercase tracking-wider text-sm mb-2">
              2. Delivery Protocols & Signatures
            </h3>
            <p>
              Due to the luxury valuation of our outerwear shipments, courier delivery requires adult signature or verified OTP handover upon delivery. If an item cannot be accepted, up to three dispatch attempts are conducted before return to warehouse.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-snow uppercase tracking-wider text-sm mb-2">
              3. Returns & Exchange Process
            </h3>
            <p>
              Garments may be returned within 30 days of arrival provided they remain in original condition, unwashed, and in the protective breathable garment casing with factory tags intact. Refunds are returned to the original payment source within 3-5 banking business days.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-snow uppercase tracking-wider text-sm mb-2">
              4. Payment & PCI-DSS Compliance
            </h3>
            <p>
              We do not store complete payment card credentials or CVV numbers on any server. Online card transactions are tokenized and processed via Stripe or certified regional gateways (Safepay, PayFast). Cash on Delivery is strictly reconciled upon handover.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;
