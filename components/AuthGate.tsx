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
  const publicPath = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user && !publicPath) {
      router.replace('/login');
      return;
    }

    if (user && publicPath) {
      router.replace('/');
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
  if (user && publicPath) return null;

  return children;
}
