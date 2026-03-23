'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint } from 'lucide-react';

function AuthCallbackInner() {
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
    <div style={{ textAlign: 'center' as const }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
        <Fingerprint size={32} color='var(--accent-amber)' strokeWidth={1.5} />
      </div>
      <p className="font-mono" style={{
        color: 'var(--accent-amber)', letterSpacing: '0.15em', fontSize: '0.85rem',
      }}>
        AUTHENTICATING...
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-primary)',
    }}>
      <Suspense fallback={
        <div style={{ textAlign: 'center' as const }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <Fingerprint size={32} color='var(--accent-amber)' strokeWidth={1.5} />
          </div>
          <p className="font-mono" style={{ color: 'var(--accent-amber)', letterSpacing: '0.15em', fontSize: '0.85rem' }}>
            LOADING...
          </p>
        </div>
      }>
        <AuthCallbackInner />
      </Suspense>
    </div>
  );
}
