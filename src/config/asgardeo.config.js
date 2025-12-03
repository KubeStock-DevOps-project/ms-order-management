/**
 * Asgardeo Configuration
 * 
 * Setup Instructions:
 * 1. Create an account at https://console.asgardeo.io
 * 2. Create a new application (Single Page Application)
 * 3. Add authorized redirect URLs:
 *    - http://localhost:5173 (development)
 *    - http://localhost:5173/callback (OAuth callback)
 * 4. Copy the Client ID and add to .env file
 * 5. Note your organization name from the URL (e.g., yourorg.asgardeo.io)
 */

module.exports = {
  // Asgardeo tenant configuration
  asgardeo: {
    // Your Asgardeo organization domain (e.g., 'myorg' from myorg.asgardeo.io)
    baseUrl: process.env.ASGARDEO_BASE_URL || 'https://api.asgardeo.io/t/{org}',
    
    // OAuth/OIDC endpoints
    tokenEndpoint: process.env.ASGARDEO_TOKEN_ENDPOINT,
    jwksUri: process.env.ASGARDEO_JWKS_URI,
    issuer: process.env.ASGARDEO_ISSUER,
    
    // Client configuration
    clientId: process.env.ASGARDEO_CLIENT_ID,
    clientSecret: process.env.ASGARDEO_CLIENT_SECRET, // Only for backend if using client credentials
    
    // Audience for token validation
    audience: process.env.ASGARDEO_AUDIENCE || process.env.ASGARDEO_CLIENT_ID,
    
    // Token validation settings
    tokenValidation: {
      clockTolerance: 60, // seconds
      maxAge: 3600, // 1 hour
    }
  },

  // Frontend configuration (for reference)
  frontend: {
    signInRedirectURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    signOutRedirectURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    scope: ['openid', 'profile', 'email'],
  }
};
