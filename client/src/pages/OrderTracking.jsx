import React, { useState } from 'react';
import { Search, CheckCircle2, Clock, Truck, Package, ShieldCheck, MapPin } from 'lucide-react';

const ORDER_LIFECYCLE_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', description: 'Payment verified and inventory allocated' },
  { key: 'processing', label: 'Atelier Processing', description: 'Inspection and custom garment handling' },
  { key: 'packing', label: 'Packing & Sealing', description: 'Sealed in breathable garment bag and thermal box' },
  { key: 'ready_for_dispatch', label: 'Ready for Dispatch', description: 'Staged at central logistics hub' },
  { key: 'assigned_to_rider', label: 'Assigned to Rider', description: 'Delivery partner assigned to shipment' },
  { key: 'out_for_delivery', label: 'Out for Delivery', description: 'Courier en route to shipping address' },
  { key: 'delivered', label: 'Delivered', description: 'Package handed over with OTP / proof of delivery' },
];

const OrderTracking = () => {
  const [orderQuery, setOrderQuery] = useState('WW-2026-8941');
  const [activeOrder, setActiveOrder] = useState({
    orderNumber: 'WW-2026-8941',
    currentStatus: 'out_for_delivery',
    statusIndex: 5,
    customerName: 'Marcus Sterling',
    destination: '74 Alpine Ridge Way, Aspen, CO 81611',
    carrier: 'WinterWear White Glove Express',
    trackingCode: 'WWX-98234190',
    estimatedDelivery: 'Today by 5:00 PM',
    riderName: 'Tariq Mahmood (Verified Rider #408)',
    timeline: [
      { status: 'Order Confirmed', time: 'Oct 12, 09:30 AM', actor: 'System Automated' },
      { status: 'Processing & Quality Verification', time: 'Oct 12, 01:15 PM', actor: 'Warehouse Inspector #12' },
      { status: 'Packed in Garment Box', time: 'Oct 13, 08:20 AM', actor: 'Fulfillment Specialist' },
      { status: 'Assigned to Rider Tariq Mahmood', time: 'Oct 13, 09:45 AM', actor: 'Dispatch Supervisor' },
      { status: 'Out for Delivery', time: 'Oct 13, 10:30 AM', actor: 'Rider Tariq Mahmood' },
    ],
  });

  const handleSearch = (e) => {
    e.preventDefault();
    // Keeps current simulated order or refreshes
  };

  return (
    <div className="min-h-screen bg-charcoal text-snow py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-editorial text-ice font-bold">
            Real-Time Logistics
          </span>
          <h1 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light">
            Track Order Progress
          </h1>
          <p className="text-xs text-silver max-w-md mx-auto">
            Input your WinterWear order number to inspect the live status across our warehousing, packing, and courier state machine.
          </p>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-silver" />
            <input
              type="text"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="e.g. WW-2026-8941"
              className="w-full bg-charcoal-surface text-snow text-xs pl-10 pr-3 py-3 rounded border border-white/10 uppercase font-mono tracking-wider focus:outline-none focus:border-cream"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-cream hover:bg-snow text-charcoal text-xs font-bold uppercase tracking-wider rounded transition-colors"
          >
            Track
          </button>
        </form>

        {/* Order Details Card */}
        {activeOrder && (
          <div className="glass-panel rounded-lg p-6 sm:p-8 border border-white/10 space-y-8 animate-fade-in">
            {/* Header Metadata */}
            <div className="flex flex-col sm:flex-row justify-between border-b border-white/10 pb-6 gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-silver-dark font-bold block">
                  Active Order
                </span>
                <span className="font-mono text-xl text-cream font-bold">{activeOrder.orderNumber}</span>
                <span className="block text-xs text-silver mt-1">Carrier: {activeOrder.carrier}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] uppercase tracking-widest text-silver-dark font-bold block">
                  Estimated Arrival
                </span>
                <span className="text-base text-snow font-semibold">{activeOrder.estimatedDelivery}</span>
                <span className="block text-xs text-ice mt-1">Rider: {activeOrder.riderName}</span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-snow mb-6">
                Lifecycle Progression
              </h3>
              <div className="space-y-6">
                {ORDER_LIFECYCLE_STEPS.map((step, idx) => {
                  const isCompleted = idx <= activeOrder.statusIndex;
                  const isCurrent = idx === activeOrder.statusIndex;

                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            isCurrent
                              ? 'bg-cream text-charcoal ring-4 ring-cream/20'
                              : isCompleted
                              ? 'bg-burgundy text-white'
                              : 'bg-charcoal-muted text-silver-dark'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        {idx !== ORDER_LIFECYCLE_STEPS.length - 1 && (
                          <div
                            className={`w-0.5 h-10 my-1 ${
                              idx < activeOrder.statusIndex ? 'bg-burgundy' : 'bg-white/10'
                            }`}
                          />
                        )}
                      </div>

                      <div className="pt-0.5">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-sm font-semibold ${
                              isCurrent ? 'text-cream' : isCompleted ? 'text-snow' : 'text-silver-dark'
                            }`}
                          >
                            {step.label}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 bg-ice text-charcoal font-bold uppercase rounded-full">
                              In Transit
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-silver mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Log */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="font-bold text-xs uppercase tracking-wider text-snow mb-3">
                Live Audit Log
              </h3>
              <div className="space-y-2">
                {activeOrder.timeline.map((entry, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1.5 border-b border-white/5 text-silver">
                    <span className="text-snow">{entry.status}</span>
                    <span className="text-silver-dark">{entry.time} ({entry.actor})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
