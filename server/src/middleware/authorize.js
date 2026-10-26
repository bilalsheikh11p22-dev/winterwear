/**
 * Role-Based Access Control (RBAC) Authorization Middleware
 * Verifies that the authenticated user possesses one of the permitted roles.
 * Supports both array and rest arguments: authorize(['admin', 'super_admin']) or authorize('admin', 'super_admin')
 */
export const authorize = (...permittedRoles) => {
  const roles = permittedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to permission verification.',
        code: 'UNAUTHORIZED',
      });
    }

    // super_admin always bypasses role checks
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is unauthorized to perform this operation. Required: [${roles.join(', ')}]`,
        code: 'FORBIDDEN_ROLE',
      });
    }

    next();
  };
};

/**
 * Checks that the authenticated user is either the resource owner OR holds an authorized staff role
 */
export const authorizeOwnerOrStaff = (getOwnerIdFromReq, ...allowedStaffRoles) => {
  const staffRoles = ['super_admin', 'admin', ...allowedStaffRoles.flat()];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
    }

    if (staffRoles.includes(req.user.role)) {
      return next();
    }

    const ownerId = getOwnerIdFromReq(req);
    if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not hold ownership permission over this resource.',
        code: 'FORBIDDEN_OWNERSHIP',
      });
    }

    next();
  };
};

export default authorize;
