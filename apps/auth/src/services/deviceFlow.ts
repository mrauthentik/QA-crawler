import crypto from 'crypto';

export interface DeviceFlow {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  pollIntervalMs: number;
}

export interface DeviceFlowSession {
  deviceCode: string;
  userCode: string;
  token?: string;
  email?: string;
  name?: string;
  expiresAt: number;
  approved: boolean;
}

// In-memory store (in production, use Redis or DB)
const deviceFlows = new Map<string, DeviceFlowSession>();

/**
 * Generate a new device flow session
 */
export function generateDeviceFlow(baseUrl: string): DeviceFlow {
  const deviceCode = crypto.randomBytes(32).toString('hex');
  const userCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const expiresIn = 600; // 10 minutes

  const session: DeviceFlowSession = {
    deviceCode,
    userCode,
    expiresAt: Date.now() + expiresIn * 1000,
    approved: false,
  };

  deviceFlows.set(deviceCode, session);

  return {
    deviceCode,
    userCode,
    verificationUrl: `${baseUrl}/auth/device?userCode=${userCode}`,
    expiresIn,
    pollIntervalMs: 3000,
  };
}

/**
 * Get device flow session
 */
export function getDeviceFlowSession(
  deviceCode: string
): DeviceFlowSession | null {
  const session = deviceFlows.get(deviceCode);
  if (!session) return null;

  // Check expiration
  if (Date.now() > session.expiresAt) {
    deviceFlows.delete(deviceCode);
    return null;
  }

  return session;
}

/**
 * Approve device flow (user scans QR code or enters code on web)
 */
export function approveDeviceFlow(
  userCode: string,
  userId: string,
  email: string,
  name: string,
  token: string
): boolean {
  // Find session by userCode
  for (const [deviceCode, session] of deviceFlows.entries()) {
    if (session.userCode === userCode && !session.approved) {
      session.approved = true;
      session.token = token;
      session.email = email;
      session.name = name;
      return true;
    }
  }
  return false;
}

/**
 * Clean up expired sessions periodically
 */
export function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [deviceCode, session] of deviceFlows.entries()) {
    if (now > session.expiresAt) {
      deviceFlows.delete(deviceCode);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
