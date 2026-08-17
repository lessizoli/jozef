'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import { validateCurrentSession } from '@/lib/authService';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const publicPath = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || publicPath) return undefined;
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      const valid = await validateCurrentSession();
      checking = false;
      if (!valid) {
        await signOut(auth);
        router.replace('/login?reason=session-replaced');
      }
    };
    const timer = window.setInterval(() => { void check(); }, 15_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', onVisible);
    void check();
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [publicPath, router, user]);

  useEffect(() => {
    if (loading) return;

    if (!user && !publicPath) {
      router.replace('/login');
      return;
    }

    if (user && publicPath) {
      let cancelled = false;
      void validateCurrentSession().then((valid) => { if (valid && !cancelled) router.replace('/'); });
      return () => { cancelled = true; };
    }
  }, [loading, publicPath, router, user]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 text-slate-300">
        <div className="text-sm">Bejelentkezés ellenőrzése…</div>
      </main>
    );
  }

  if (!user && !publicPath) return null;
  return children;
}
