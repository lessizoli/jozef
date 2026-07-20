'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ProjectFilesShortcut() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/dokumentumok') return null;

  return (
    <Link
      href="/dokumentumok"
      className="fixed bottom-5 right-5 z-40 rounded-full border border-sky-400/40 bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-sky-500"
    >
      Képek és jegyzetek
    </Link>
  );
}
