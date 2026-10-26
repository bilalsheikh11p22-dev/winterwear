import NotificationCampaign from '../../models/NotificationCampaign.js';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Wishlist from '../../models/Wishlist.js';
import { createNotification } from './notificationService.js';
import { getPreferencesMap } from './preferenceService.js';
import { renderNotificationEmail } from './emailTemplates.js';
import { describeCoupon } from '../coupons/couponService.js';
import { isSafeInternalPath } from './catalog.js';

const BATCH = () => Number(process.env.CAMPAIGN_BATCH_SIZE) || 200;
const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const primaryImage = (p) => (p.images || []).find((i) => i.isPrimary)?.url || p.images?.[0]?.url || '';
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

/** Build the notification content from REAL records (never from hard-coded strings). */
export const buildCampaignContent = async (campaign) => {
  if (campaign.kind === 'product_announcement') {
    const products = await Product.find({ _id: { $in: campaign.products }, isPublished: true }).populate('category', 'name');
    if (!products.length) throw fail('None of the campaign products are published. Draft products are never announced.');
    const first = products[0];
    const onSale = first.salePrice != null && first.salePrice < first.regularPrice;
    const single = products.length === 1;
    return {
      type: 'product_published',
      title: campaign.title || (single ? `New arrival: ${first.name}` : 'New arrivals at WinterWear'),
      message: campaign.message || (single
        ? `${first.name}${first.category?.name ? ` · ${first.category.name}` : ''} — ${onSale ? `${money(first.salePrice)} (was ${money(first.regularPrice)})` : money(first.regularPrice)}.`
        : `${products.length} new pieces just landed, including ${first.name}.`),
      data: {
        productId: String(first._id), productSlug: first.slug, productName: first.name,
        price: first.regularPrice, salePrice: onSale ? first.salePrice : undefined, currency: 'PKR',
        categoryName: first.category?.name || '',
      },
      actionUrl: campaign.actionUrl || (single ? `/product/${first.slug}` : '/shop?sort=newest'),
      imageUrl: primaryImage(first),
    };
  }

  if (campaign.kind === 'coupon') {
    const coupon = await Coupon.findById(campaign.coupon);
    if (!coupon) throw fail('Coupon not found.');
    if (!coupon.isActive || coupon.validUntil < new Date()) throw fail('Only an active, unexpired coupon can be announced.');
    const exclusive = campaign.audience?.segment === 'specific_users';
    return {
      type: exclusive ? 'coupon_exclusive' : 'coupon_announced',
      title: campaign.title || (exclusive ? 'An exclusive offer for you' : `${coupon.name || 'New offer'}: ${describeCoupon(coupon)}`),
      message: campaign.message ||
        `Get ${describeCoupon(coupon)} with ${coupon.code}${coupon.minOrderAmount ? ` on orders over ${money(coupon.minOrderAmount)}` : ''}. Valid until ${coupon.validUntil.toDateString()}.`,
      data: { couponCode: coupon.code, couponId: String(coupon._id), discountLabel: describeCoupon(coupon), expiresAt: coupon.validUntil },
      actionUrl: campaign.actionUrl || '/shop',
      imageUrl: '',
    };
  }

  if (!campaign.title || !campaign.message) throw fail('Custom campaigns need a title and message.');
  return { type: 'campaign_launched', title: campaign.title, message: campaign.message, data: {}, actionUrl: campaign.actionUrl || '/shop', imageUrl: '' };
};

export const previewCampaign = async (campaign, user) => {
  const content = await buildCampaignContent(campaign);
  const email = renderNotificationEmail({ ...content }, { name: user?.name || 'there', unsubscribeUrl: '#unsubscribe' });
  return { notification: content, email };
};

const validateInput = async (input) => {
  if (input.actionUrl && !isSafeInternalPath(input.actionUrl)) throw fail('actionUrl must be an internal path such as /shop');
  if (input.kind === 'product_announcement') {
    const n = await Product.countDocuments({ _id: { $in: input.products || [] }, isPublished: true });
    if (!input.products?.length || n !== input.products.length) throw fail('All selected products must exist and be published.');
  }
  if (input.kind === 'coupon') {
    const c = await Coupon.findById(input.coupon);
    if (!c) throw fail('Coupon not found.');
    if (!c.isActive || c.validUntil < new Date()) throw fail('Coupon must be active and unexpired.');
  }
  if (input.kind === 'custom' && (!input.title || !input.message)) throw fail('Custom campaigns need a title and message.');
  if (input.audience?.segment === 'specific_users' && !input.audience.userIds?.length) throw fail('Select at least one user.');
  if (input.audience?.segment === 'wishlist_of_product' && !(input.products?.length)) throw fail('Select the product whose wishlist audience you are targeting.');
};

export const createCampaign = async (input, actor) => {
  await validateInput(input);
  if (input.eventKey) {
    const existing = await NotificationCampaign.findOne({ eventKey: input.eventKey });
    if (existing) return { campaign: existing, duplicate: true };
  }
  const campaign = await NotificationCampaign.create({ ...input, status: 'draft', createdBy: actor?._id });
  return { campaign, duplicate: false };
};

/** draft → running now, or → scheduled if scheduledAt is in the future. Atomic: a double click cannot start it twice. */
export const publishCampaign = async (id) => {
  const c = await NotificationCampaign.findById(id);
  if (!c) throw fail('Campaign not found.', 404);
  await validateInput(c.toObject());
  const future = c.scheduledAt && c.scheduledAt > new Date();
  const updated = await NotificationCampaign.findOneAndUpdate(
    { _id: id, status: { $in: ['draft', 'paused'] } },
    { $set: future ? { status: 'scheduled' } : { status: 'running', startedAt: c.startedAt || new Date() } },
    { new: true }
  );
  if (!updated) throw fail(`A ${c.status} campaign cannot be published.`, 409);
  return updated;
};

export const pauseCampaign = async (id) => {
  const c = await NotificationCampaign.findOneAndUpdate({ _id: id, status: { $in: ['running', 'scheduled'] } }, { $set: { status: 'paused' } }, { new: true });
  if (!c) throw fail('Only running or scheduled campaigns can be paused.', 409);
  return c;
};

export const cancelCampaign = async (id) => {
  const c = await NotificationCampaign.findOneAndUpdate(
    { _id: id, status: { $in: ['draft', 'scheduled', 'running', 'paused'] } },
    { $set: { status: 'cancelled' } },
    { new: true }
  );
  if (!c) throw fail('This campaign can no longer be cancelled.', 409);
  return c;
};

const audienceQuery = async (campaign) => {
  const q = { role: 'customer', isActive: true };
  const a = campaign.audience || {};
  switch (a.segment) {
    case 'previous_buyers':
      q._id = { $in: await Order.distinct('customer', { orderStatus: 'delivered' }) };
      break;
    case 'new_customers':
      q.createdAt = { $gte: new Date(Date.now() - (a.newCustomerDays || 30) * 86400000) };
      break;
    case 'wishlist_of_product':
      q._id = { $in: await Wishlist.distinct('user', { products: { $in: campaign.products } }) };
      break;
    case 'specific_users':
      q._id = { $in: a.userIds };
      break;
    default:
  }
  return q;
};

/** Process one batch. Returns true when more remain. Safe to call from several workers (sends are deduped). */
export const runCampaignBatch = async (id) => {
  const campaign = await NotificationCampaign.findById(id);
  if (!campaign || campaign.status !== 'running') return false;

  let content;
  try {
    content = await buildCampaignContent(campaign);
  } catch (err) {
    await NotificationCampaign.updateOne({ _id: id, status: 'running' }, { $set: { status: 'failed', lastError: err.message } });
    return false;
  }

  const q = await audienceQuery(campaign);
  const base = q._id ? { ...q } : q;
  const users = await User.find({ ...base, ...(campaign.cursor ? { _id: { ...(q._id || {}), $gt: campaign.cursor } } : {}) })
    .sort({ _id: 1 })
    .limit(BATCH())
    .select('role isActive');

  const prefOf = await getPreferencesMap(users.map((u) => u._id));
  const inc = { scanned: 0, created: 0, duplicates: 0, skippedPreference: 0, skippedFrequency: 0, emailQueued: 0 };

  for (const u of users) {
    inc.scanned += 1;
    const r = await createNotification({
      recipient: u._id, recipientDoc: u, prefs: prefOf(u._id),
      ...content, campaign: campaign._id, eventId: `campaign:${campaign._id}`, emailRequested: !!campaign.sendEmail,
    });
    if (r.status === 'created') {
      inc.created += 1;
      if (r.notification.deliveryStatus.email === 'pending') inc.emailQueued += 1;
    } else if (r.status === 'duplicate') inc.duplicates += 1;
    else if (r.status === 'skipped_preference') inc.skippedPreference += 1;
    else if (r.status === 'skipped_frequency') inc.skippedFrequency += 1;
  }

  const last = users.length ? users[users.length - 1]._id : campaign.cursor;
  const finished = users.length < BATCH();
  await NotificationCampaign.updateOne(
    { _id: id, status: 'running' }, // a pause/cancel during the batch wins
    {
      $set: { cursor: last, ...(finished ? { status: 'completed', completedAt: new Date() } : {}) },
      $inc: Object.fromEntries(Object.entries(inc).map(([k, v]) => [`stats.${k}`, v])),
    }
  );
  return !finished;
};

export const runCampaignBatches = async (id, { maxBatches = 100 } = {}) => {
  for (let i = 0; i < maxBatches; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await runCampaignBatch(id))) break;
  }
};

/** Worker entry: start due scheduled campaigns and keep running ones moving. */
export const tickCampaigns = async () => {
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const due = await NotificationCampaign.findOneAndUpdate(
      { status: 'scheduled', scheduledAt: { $lte: new Date() } },
      { $set: { status: 'running', startedAt: new Date() } },
      { new: true }
    );
    if (!due) break;
  }
  const running = await NotificationCampaign.find({ status: 'running' }).select('_id').lean();
  for (const c of running) {
    // eslint-disable-next-line no-await-in-loop
    await runCampaignBatches(c._id, { maxBatches: 5 });
  }
};
