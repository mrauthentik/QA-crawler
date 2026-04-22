import localtunnel from 'localtunnel';

export interface TunnelResult {
  publicUrl: string;
  close: () => void;
}

export async function createTunnel(localPort: number): Promise<TunnelResult> {
  return new Promise((resolve, reject) => {
    localtunnel({ port: localPort })
      .then(tunnel => {
        tunnel.on('error', (err: Error) => {
          console.warn(`Tunnel error: ${err.message}`);
        });

        resolve({
          publicUrl: tunnel.url,
          close: () => tunnel.close(),
        });
      })
      .catch(reject);
  });
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
