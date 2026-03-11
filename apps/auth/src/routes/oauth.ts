import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { upsertGoogleUser } from '../db/index';
import { signToken } from '../services/token';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3002';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${AUTH_URL}/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'));
        const user = await upsertGoogleUser({
          email,
          name: profile.displayName,
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value,
        });
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  ));
  console.log('🌐 Google OAuth enabled');
} else {
  console.log('⚠️  Google OAuth disabled — GOOGLE_CLIENT_ID not set');
}

// GET /auth/google
router.get('/google', (req: Request, res: Response, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(503).json({ error: 'Google OAuth is not configured on this server' });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

// GET /auth/google/callback
router.get('/google/callback', (req: Request, res: Response, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.redirect(`${DASHBOARD_URL}/login?error=google_not_configured`);
    return;
  }
  passport.authenticate(
    'google',
    { session: false },
    (err: Error, user: { id: string; email: string; name: string; avatar?: string }) => {
      if (err || !user) {
        res.redirect(`${DASHBOARD_URL}/login?error=google_failed`);
        return;
      }
      const token = signToken({ userId: user.id, email: user.email, name: user.name });
      res.redirect(`${DASHBOARD_URL}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
    }
  )(req, res, next);
});

export default router;
