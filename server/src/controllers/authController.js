import * as authService from '../services/authService.js';
import User from '../models/User.js';
import crypto from 'crypto';
import { publishAccountEvent } from '../services/notifications/events.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
  approvalStatus: user.approvalStatus || 'approved',
  approvalNote: user.approvalNote || '',
  riderProfile: user.role === 'rider' ? user.riderProfile : undefined,
  createdAt: user.createdAt,
  lastLogin: user.lastLogin,
});

export const register = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.registerCustomer(req.body);

    // Set secure HTTP-only refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user: publicUser(user),
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const registerRider = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.registerRider(req.body);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted. An admin will review and confirm your rider account.',
      data: { user: publicUser(user), accessToken },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const { user, accessToken, refreshToken } = await authService.loginUser({
      email,
      password,
      ipAddress,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Authentication successful.',
      data: {
        user: publicUser(user),
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const incomingToken = req.body.refreshToken || req.cookies.refreshToken;
    const { accessToken, refreshToken, user } = await authService.refreshSession(incomingToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Session refreshed.',
      data: {
        user: publicUser(user),
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    if (req.user) {
      await authService.logoutUser(req.user._id, token);
    }
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    data: { user: publicUser(req.user) },
  });
};

export const updateProfile = async (req, res, next) => {
  try {
    const update = { name: req.body.name };
    if (req.body.phone !== undefined) update.phone = req.body.phone;

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    });

    await publishAccountEvent({ userId: req.user._id, kind: 'profile_updated', key: String(Math.floor(Date.now() / 60000)) });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: publicUser(user) },
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from the current password.',
        code: 'PASSWORD_UNCHANGED',
      });
    }

    user.password = newPassword;

    // Sign out every other session, then issue a fresh one for this device
    const { accessToken, refreshToken } = authService.generateTokens(user);
    user.refreshTokens = [
      {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip || '',
      },
    ];
    await user.save();
    await publishAccountEvent({ userId: user._id, kind: 'password_changed', key: String(Date.now()) });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Password changed successfully. Other devices have been signed out.',
      data: { accessToken },
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond generically to prevent account enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been dispatched.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save({ validateBeforeSave: false });

    // In production, dispatch via emailService
    res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been dispatched.',
      ...(process.env.NODE_ENV === 'development' && { devResetToken: resetToken }),
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired.',
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Revoke existing sessions
    await user.save();
    await publishAccountEvent({ userId: user._id, kind: 'password_reset', key: String(Date.now()) });

    res.json({ success: true, message: 'Password has been updated. Please sign in with your new password.' });
  } catch (err) {
    next(err);
  }
};
