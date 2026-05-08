import ngrok from 'ngrok';

export interface TunnelResult {
  publicUrl: string;
  close: () => Promise<void> | void;
  provider: string;
}

type TunnelProvider = 'ngrok' | 'localtunnel' | 'cloudflare';

/**
 * Create tunnel with fallback support
 * Priority: ngrok (most reliable) → localtunnel → error
 */
export async function createTunnel(localPort: number): Promise<TunnelResult> {
  const provider = (process.env.QA_DETECTIVE_TUNNEL_PROVIDER as TunnelProvider) || 'ngrok';
  
  try {
    if (provider === 'ngrok') {
      return await createTunnelNgrok(localPort);
    } else if (provider === 'cloudflare') {
      return await createTunnelCloudflare(localPort);
    } else if (provider === 'localtunnel') {
      return await createTunnelLocaltunnel(localPort);
    } else {
      // Default to ngrok
      return await createTunnelNgrok(localPort);
    }
  } catch (err) {
    // Fallback if primary provider fails
    if (provider !== 'localtunnel') {
      try {
        return await createTunnelLocaltunnel(localPort);
      } catch (fallbackErr) {
        throw new Error(
          `Tunnel creation failed:\n` +
          `  Primary (${provider}): ${(err as Error).message}\n` +
          `  Fallback (localtunnel): ${(fallbackErr as Error).message}\n\n` +
          `Options:\n` +
          `  1. Set up ngrok: export NGROK_AUTHTOKEN=<token> && qa-detective scan <url>\n` +
          `  2. Use Cloudflare: export QA_DETECTIVE_TUNNEL_PROVIDER=cloudflare\n` +
          `  3. Scan external URL instead of localhost\n` +
          `  4. Run with --local flag to use local Python agent`
        );
      }
    }
    throw err;
  }
}

async function createTunnelNgrok(localPort: number): Promise<TunnelResult> {
  try {
    const url = await ngrok.connect({
      addr: localPort,
      authtoken: process.env.NGROK_AUTHTOKEN,
    });
    
    return {
      publicUrl: url,
      provider: 'ngrok',
      close: async () => {
        await ngrok.disconnect();
      },
    };
  } catch (err) {
    throw new Error(`ngrok failed: ${(err as Error).message}`);
  }
}

async function createTunnelLocaltunnel(localPort: number): Promise<TunnelResult> {
  try {
    const localtunnel = await import('localtunnel');
    
    return new Promise((resolve, reject) => {
      localtunnel
        .default({ port: localPort })
        .then(tunnel => {
          tunnel.on('error', (err: Error) => {
            console.warn(`Tunnel warning: ${err.message}`);
          });

          resolve({
            publicUrl: tunnel.url,
            provider: 'localtunnel',
            close: () => tunnel.close(),
          });
        })
        .catch(reject);
    });
  } catch (err) {
    throw new Error(`localtunnel failed: ${(err as Error).message}`);
  }
}

async function createTunnelCloudflare(localPort: number): Promise<TunnelResult> {
  // Cloudflare Tunnel requires cloudflared CLI
  // This is a placeholder for future implementation
  throw new Error(
    'Cloudflare Tunnel requires cloudflared CLI.\n' +
    'Install: https://developers.cloudflare.com/cloudflare-one/downloads/\n' +
    'Then run: cloudflared tunnel --url localhost:' + localPort
  );
}

export function isLocalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0' ||
      parsed.hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
}

export function extractPort(url: string): number {
  try {
    const parsed = new URL(url);
    if (parsed.port) return parseInt(parsed.port);
    return parsed.protocol === 'https:' ? 443 : 80;
  } catch {
    return 3000;
  }
}
