import jwt from 'jsonwebtoken';
import NotificationPreference, { PREFERENCE_KEYS } from '../../models/NotificationPreference.js';
import { ENV } from '../../config/env.js';

const DEFAULTS = {
  orderUpdates: { inApp: true, email: true },
  newArrivals: { inApp: true, email: false },
  backInStock: { inApp: true, email: false },
  priceDrop: { inApp: true, email: false },
  discounts: { inApp: true, email: false },
  marketingEmails: false,
};

export const defaultPreferences = () => JSON.parse(JSON.stringify(DEFAULTS));

const normalise = (doc) => {
  const base = defaultPreferences();
  if (!doc) return base;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  for (const k of PREFERENCE_KEYS) base[k] = { ...base[k], ...(o[k] || {}) };
  base.marketingEmails = !!o.marketingEmails;
  return base;
};

export const getPreferences = async (userId) => normalise(await NotificationPreference.findOne({ user: userId }).lean());

export const getPreferencesMap = async (userIds) => {
  const docs = await NotificationPreference.find({ user: { $in: userIds } }).lean();
  const map = new Map(docs.map((d) => [String(d.user), normalise(d)]));
  return (id) => map.get(String(id)) || defaultPreferences();
};

export const updatePreferences = async (userId, patch) => {
  const $set = {};
  for (const key of PREFERENCE_KEYS) {
    if (!patch[key]) continue;
    if (typeof patch[key].inApp === 'boolean') $set[`${key}.inApp`] = patch[key].inApp;
    if (typeof patch[key].email === 'boolean') $set[`${key}.email`] = patch[key].email;
  }
  if (typeof patch.marketingEmails === 'boolean') {
    $set.marketingEmails = patch.marketingEmails;
    if (patch.marketingEmails) {
      $set.marketingConsentAt = new Date();
    } else {
      $set.marketingUnsubscribedAt = new Date();
    }
  }
  const doc = await NotificationPreference.findOneAndUpdate(
    { user: userId },
    { $set, $setOnInsert: { user: userId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return normalise(doc);
};

/** Decide which channels may carry a notification of this catalog type for these preferences. */
export const channelDecision = (meta, prefs, { campaignEmail = null } = {}) => {
  const p = meta.pref ? prefs[meta.pref] : null;
  const inApp = p ? p.inApp !== false : true;
  let email = false;
  if (meta.email) {
    if (meta.transactional) {
      // Order updates can be switched off; security/account email cannot.
      email = meta.pref ? p.email !== false : true;
    } else {
      // Marketing email: explicit master opt-in AND the category-level email opt-in.
      email = prefs.marketingEmails === true && !!p && p.email === true;
    }
    if (campaignEmail === false) email = false;
  }
  return { inApp, email };
};

// ── Unsubscribe links (signed, no login required) ────────────────────────────────────
export const signUnsubscribeToken = (userId) =>
  jwt.sign({ sub: String(userId), purpose: 'unsubscribe_marketing' }, ENV.JWT.ACCESS_SECRET, { expiresIn: '365d' });

export const unsubscribeFromToken = async (token) => {
  const decoded = jwt.verify(token, ENV.JWT.ACCESS_SECRET);
  if (decoded.purpose !== 'unsubscribe_marketing') throw Object.assign(new Error('Invalid token'), { status: 400 });
  await updatePreferences(decoded.sub, { marketingEmails: false });
  return decoded.sub;
};
