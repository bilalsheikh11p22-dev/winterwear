import mongoose from 'mongoose';

const channelPair = (inApp, email) => ({
  inApp: { type: Boolean, default: inApp },
  email: { type: Boolean, default: email },
});

// One document per user. Transactional security notifications are NOT configurable here.
const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    orderUpdates: channelPair(true, true),
    newArrivals: channelPair(true, false),
    backInStock: channelPair(true, false),
    priceDrop: channelPair(true, false),
    discounts: channelPair(true, false),
    // Master switch for any promotional email. Opt-IN: default false.
    marketingEmails: { type: Boolean, default: false },
    marketingConsentAt: Date,
    marketingUnsubscribedAt: Date,
  },
  { timestamps: true }
);

export const PREFERENCE_KEYS = ['orderUpdates', 'newArrivals', 'backInStock', 'priceDrop', 'discounts'];

export default mongoose.model('NotificationPreference', notificationPreferenceSchema);
