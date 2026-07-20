'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== '/login') {
      router.replace('/login');
      return;
    }

    if (user && pathname === '/login') {
      router.replace('/');
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 text-slate-300">
        <div className="text-sm">Bejelentkezés ellenőrzése…</div>
      </main>
    );
  }

  if (!user && pathname !== '/login') return null;
  if (user && pathname === '/login') return null;

  return children;
}
