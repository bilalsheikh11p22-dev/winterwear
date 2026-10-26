/**
 * One-off, idempotent setup for the notification / coupon system.
 *   npm run db:indexes
 *  1. Builds every index (autoIndex is off in production, so new unique/TTL/partial indexes must be created explicitly).
 *  2. Back-fills new fields on pre-existing documents:
 *       - Notification.category / isMarketing  (from the type catalog; legacy rows had neither)
 *       - Product.publishedAt                   (= createdAt for already-published products, so "New Arrivals" ordering works)
 * Safe to run repeatedly. It never deletes documents.
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import Notification from '../src/models/Notification.js';
import NotificationPreference from '../src/models/NotificationPreference.js';
import NotificationCampaign from '../src/models/NotificationCampaign.js';
import NotificationDeliveryAttempt from '../src/models/NotificationDeliveryAttempt.js';
import OutboxEvent from '../src/models/OutboxEvent.js';
import Coupon from '../src/models/Coupon.js';
import CouponRedemption from '../src/models/CouponRedemption.js';
import ProductSubscription from '../src/models/ProductSubscription.js';
import Product from '../src/models/Product.js';
import { NOTIFICATION_TYPES } from '../src/services/notifications/catalog.js';

await connectDatabase();

for (const m of [Notification, NotificationPreference, NotificationCampaign, NotificationDeliveryAttempt, OutboxEvent, Coupon, CouponRedemption, ProductSubscription, Product]) {
  const dropped = await m.syncIndexes();
  console.log(`[indexes] ${m.modelName}: synced${dropped.length ? ` (dropped ${dropped.join(', ')})` : ''}`);
}

let fixed = 0;
for (const [type, meta] of Object.entries(NOTIFICATION_TYPES)) {
  const r = await Notification.updateMany(
    { type, $or: [{ category: { $exists: false } }, { category: '' }] },
    { $set: { category: meta.category, isMarketing: !meta.transactional } }
  );
  fixed += r.modifiedCount;
}
console.log(`[migrate] Notifications categorised: ${fixed}`);

const p = await Product.updateMany({ isPublished: true, publishedAt: { $in: [null, undefined] } }, [{ $set: { publishedAt: '$createdAt' } }]);
console.log(`[migrate] Products given publishedAt: ${p.modifiedCount}`);

await mongoose.disconnect();
