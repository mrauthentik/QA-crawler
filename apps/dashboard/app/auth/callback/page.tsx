'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const name = searchParams.get('name');
    const error = searchParams.get('error');

    if (error) {
      router.push(`/login?error=${error}`);
      return;
    }

    if (token) {
      localStorage.setItem('qa_token', token);
      if (name) {
        localStorage.setItem('qa_user', JSON.stringify({ name: decodeURIComponent(name) }));
      }
      router.push('/');
    } else {
      router.push('/login?error=no_token');
    }
  }, [searchParams, router]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-primary)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🕵️</div>
        <p className="font-mono" style={{
          color: 'var(--accent-amber)', letterSpacing: '0.15em', fontSize: '0.85rem',
        }}>
          AUTHENTICATING...
        </p>
      </div>
    </div>
  );
}
