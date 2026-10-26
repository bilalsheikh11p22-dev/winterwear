import User from '../models/User.js';

/**
 * Makes sure the admin account described in .env (ADMIN_EMAIL / ADMIN_PASSWORD /
 * ADMIN_NAME) exists and has an admin role, so the admin panel is always reachable.
 *
 *  - missing account            -> created (all environments)
 *  - account is not staff admin -> promoted to 'admin' (development only)
 *  - password differs from .env -> reset to the .env value (development only)
 *
 * Set ADMIN_AUTO_SYNC=false to disable.
 */
export const ensureAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_AUTO_SYNC, NODE_ENV } = process.env;

  if (ADMIN_AUTO_SYNC === 'false' || !ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  try {
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const password = ADMIN_PASSWORD.trim();
    const isProd = NODE_ENV === 'production';

    if (password.length < 8) {
      console.warn('[Admin] ADMIN_PASSWORD must be at least 8 characters. Skipping admin sync.');
      return;
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      await User.create({
        name: (ADMIN_NAME || 'WinterWear Admin').trim(),
        email,
        password,
        role: 'admin',
        isActive: true,
      });
      console.log(`[Admin] Created admin account: ${email}`);
      return;
    }

    if (isProd) return;

    const changes = [];
    if (!['admin', 'super_admin'].includes(user.role)) {
      user.role = 'admin';
      changes.push('role -> admin');
    }
    if (!user.isActive) {
      user.isActive = true;
      changes.push('reactivated');
    }
    if (!(await user.comparePassword(password))) {
      user.password = password; // hashed by the pre-save hook
      changes.push('password reset to .env value');
    }

    if (changes.length) {
      await user.save();
      console.log(`[Admin] Synced ${email}: ${changes.join(', ')}`);
    } else {
      console.log(`[Admin] Admin account ready: ${email} (${user.role})`);
    }
  } catch (err) {
    console.error(`[Admin] Could not sync admin account: ${err.message}`);
  }
};

export default ensureAdmin;
