'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const JWT_EXPIRY_BUFFER_MS = 60 * 1000; // redirect 60s before actual expiry

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return Date.now() >= expiry - JWT_EXPIRY_BUFFER_MS;
}

export function useAuth(redirectIfUnauthenticated = true) {
  const router = useRouter();

  const logout = useCallback((reason?: string) => {
    localStorage.removeItem('qa_token');
    localStorage.removeItem('qa_user');
    const url = reason ? `/login?reason=${reason}` : '/login';
    router.push(url);
  }, [router]);

  const getToken = useCallback((): string => {
    const token = localStorage.getItem('qa_token');
    if (!token) {
      if (redirectIfUnauthenticated) logout('unauthenticated');
      return '';
    }
    if (isTokenExpired(token)) {
      logout('session_expired');
      return '';
    }
    return token;
  }, [redirectIfUnauthenticated, logout]);

  const authHeaders = useCallback((): HeadersInit => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  }), [getToken]);

  // Auth guard on mount
  useEffect(() => {
    if (!redirectIfUnauthenticated) return;
    const token = localStorage.getItem('qa_token');
    if (!token || isTokenExpired(token)) {
      logout(token ? 'session_expired' : 'unauthenticated');
    }
  }, [redirectIfUnauthenticated, logout]);

  // Proactive expiry check — re-checks every minute
  useEffect(() => {
    if (!redirectIfUnauthenticated) return;
    const interval = setInterval(() => {
      const token = localStorage.getItem('qa_token');
      if (!token || isTokenExpired(token)) {
        logout('session_expired');
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [redirectIfUnauthenticated, logout]);

  return { getToken, authHeaders, logout };
}
