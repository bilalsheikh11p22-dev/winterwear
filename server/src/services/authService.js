import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { ENV } from '../config/env.js';
import { sendNotification } from './auditService.js';

export const generateTokens = (user) => {
  const payload = { id: user._id, role: user.role };

  const accessToken = jwt.sign(payload, ENV.JWT.ACCESS_SECRET, {
    expiresIn: ENV.JWT.ACCESS_TTL,
  });

  const refreshToken = jwt.sign(payload, ENV.JWT.REFRESH_SECRET, {
    expiresIn: ENV.JWT.REFRESH_TTL,
  });

  return { accessToken, refreshToken };
};

import { publishAccountEvent } from './notifications/events.js';

export const registerCustomer = async ({ name, email, password, phone }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    const error = new Error('An account with this email address is already registered.');
    error.code = 'EMAIL_ALREADY_EXISTS';
    error.status = 409;
    throw error;
  }

  // Public registration is strictly locked to 'customer' role
  const user = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: 'customer',
  });

  const { accessToken, refreshToken } = generateTokens(user);

  // Store refresh token
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await user.save({ validateBeforeSave: false });

  await publishAccountEvent({ userId: user._id, kind: 'registered', key: 'once' });

  return { user, accessToken, refreshToken };
};

export const loginUser = async ({ email, password, ipAddress = '' }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    const error = new Error('Invalid email or password.');
    error.code = 'INVALID_CREDENTIALS';
    error.status = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account has been deactivated. Please contact client concierge.');
    error.code = 'ACCOUNT_DEACTIVATED';
    error.status = 403;
    throw error;
  }

  const { accessToken, refreshToken } = generateTokens(user);

  // Security alert: a sign-in from a network we have not seen on any live session of this account
  const knownIps = user.refreshTokens.filter((rt) => rt.expiresAt > new Date() && rt.ipAddress).map((rt) => rt.ipAddress);
  const isNewNetwork = !!ipAddress && knownIps.length > 0 && !knownIps.includes(ipAddress);

  // Clean expired refresh tokens and add new one
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.expiresAt > new Date());
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress,
  });
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  if (isNewNetwork) {
    await publishAccountEvent({ userId: user._id, kind: 'new_login', key: `${ipAddress}:${new Date().toISOString().slice(0, 10)}` });
  }

  return { user, accessToken, refreshToken };
};

export const refreshSession = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    const error = new Error('Refresh token is required.');
    error.status = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, ENV.JWT.REFRESH_SECRET);
  } catch {
    const error = new Error('Invalid or expired refresh token.');
    error.status = 401;
    throw error;
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    const error = new Error('User not found or account inactive.');
    error.status = 401;
    throw error;
  }

  // Verify token exists in database (rotation & revocation verification)
  const tokenDoc = user.refreshTokens.find((t) => t.token === incomingRefreshToken);
  if (!tokenDoc) {
    // Possible token reuse attack: revoke all tokens for this user!
    user.refreshTokens = [];
    await user.save({ validateBeforeSave: false });
    const error = new Error('Session invalidated due to suspicious refresh activity.');
    error.status = 401;
    throw error;
  }

  // Rotate refresh token
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

  user.refreshTokens = user.refreshTokens.filter((t) => t.token !== incomingRefreshToken);
  user.refreshTokens.push({
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken, user };
};

export const logoutUser = async (userId, tokenToRevoke) => {
  const user = await User.findById(userId);
  if (user && tokenToRevoke) {
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== tokenToRevoke);
    await user.save({ validateBeforeSave: false });
  }
};

/**
 * Rider self-registration. The account is created as role 'rider' with approvalStatus 'pending'
 * and every active admin receives a notification to review the application.
 */
export const registerRider = async ({ name, email, password, phone, vehicleType, city }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    const error = new Error('An account with this email address is already registered.');
    error.code = 'EMAIL_ALREADY_EXISTS';
    error.status = 409;
    throw error;
  }

  const user = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: 'rider',
    approvalStatus: 'pending',
    riderProfile: { vehicleType: vehicleType || '', city: city || '' },
  });

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await user.save({ validateBeforeSave: false });

  const admins = await User.find({ role: { $in: ['admin', 'super_admin'] }, isActive: true }).select('_id');
  await Promise.all(
    admins.map((admin) =>
      sendNotification({
        recipientId: admin._id,
        title: 'New rider application',
        message: `${user.name} (${user.phone || user.email}) applied to become a delivery rider and is waiting for your approval.`,
        type: 'rider_application',
        referenceId: user._id.toString(),
        referenceModel: 'User',
      })
    )
  );

  return { user, accessToken, refreshToken };
};
