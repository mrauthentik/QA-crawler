import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const CREDENTIALS_DIR = path.join(os.homedir(), '.qa-detective');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'credentials.json');

export interface StoredCredentials {
  token: string;
  email: string;
  name: string;
  expiresAt?: number;
  refreshToken?: string;
}

/**
 * Ensure credentials directory exists
 */
function ensureCredentialsDir() {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Save credentials to local file (~/.qa-detective/credentials.json)
 */
export function saveCredentials(creds: StoredCredentials) {
  ensureCredentialsDir();
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), {
    mode: 0o600, // Read/write for owner only
  });
}

/**
 * Load credentials from local file
 */
export function loadCredentials(): StoredCredentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) return null;
    const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(data) as StoredCredentials;
  } catch {
    return null;
  }
}

/**
 * Clear stored credentials
 */
export function clearCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Open browser to authentication URL
 */
function openBrowser(url: string) {
  const commands = {
    darwin: `open "${url}"`,
    linux: `xdg-open "${url}" 2>/dev/null || echo ""`,
    win32: `start "${url}"`,
  };

  const cmd = commands[process.platform as keyof typeof commands];
  if (cmd) {
    try {
      execSync(cmd, { stdio: 'ignore' });
    } catch {
      // Ignore if browser fails to open
    }
  }
}

/**
 * Get base URL for auth service (prod or local dev)
 */
export function getAuthServiceUrl(): string {
  return (
    process.env.QA_DETECTIVE_AUTH_URL ||
    process.env.AUTH_URL ||
    'http://localhost:3002'
  );
}

/**
 * Initiate browser-based login flow
 * User's browser will open and they'll get a login link
 */
export async function loginInteractive(): Promise<StoredCredentials> {
  const authUrl = getAuthServiceUrl();
  const loginUrl = `${authUrl}/auth/cli-login`;

  console.log('\n🔐 Opening browser for login...\n');
  console.log(`If browser doesn't open, visit:\n${loginUrl}\n`);

  openBrowser(loginUrl);

  // For demo: Show a simple polling flow
  // In production, you'd use device flow or have the browser POST back to a local server
  console.log('Waiting for authentication...');
  console.log('(This will timeout in 2 minutes)\n');

  // Simulate waiting for user to complete auth
  // In production, this would be a proper device flow or webhook
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write('.');

    // Check if credentials exist (set by auth service callback)
    // In real implementation, auth service would POST to a local endpoint
  }

  throw new Error('Authentication timeout');
}

/**
 * Validate token by calling API
 */
export async function validateToken(token: string, apiUrl?: string): Promise<boolean> {
  try {
    const url = apiUrl || process.env.QA_DETECTIVE_API_URL || 'https://qa-detective-api-production.up.railway.app';
    const res = await fetch(`${url}/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
