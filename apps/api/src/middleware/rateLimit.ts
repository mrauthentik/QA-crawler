import rateLimit from 'express-rate-limit';

// General API rate limit — 500 requests per 15 minutes per IP
// Generous enough for polling (results page polls every 4s = ~225 req/15min)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests — please try again in 15 minutes',
    code: 'RATE_LIMITED',
  },
});

// Strict limit for run submission only — max 10 runs per hour per IP
// This protects your Groq API key from being spammed
export const runCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many investigations queued — maximum 10 per hour',
    code: 'RUN_RATE_LIMITED',
  },
});
