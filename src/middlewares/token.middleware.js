/**
 * Token Decoder Middleware for Local Development
 * 
 * In production, Istio sidecar validates JWT tokens.
 * This middleware simply decodes the token and extracts user info.
 * 
 * For local development without Istio, this provides a passthrough
 * that extracts user info from the token if present.
 */

const decodeToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided - for local development, continue without user context
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    // Decode JWT without verification (Istio handles verification in production)
    const parts = token.split('.');
    if (parts.length !== 3) {
      req.user = null;
      return next();
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    // Extract user information from token
    req.user = {
      sub: payload.sub,
      email: payload.email || payload.username,
      name: payload.name || payload.given_name,
      roles: payload.groups || payload.roles || [],
      rawPayload: payload
    };

    next();
  } catch (error) {
    console.warn('Token decode warning:', error.message);
    req.user = null;
    next();
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware chain for authentication
const authenticate = [decodeToken, requireAuth];

module.exports = {
  decodeToken,
  requireAuth,
  authorizeRoles,
  authenticate
};
