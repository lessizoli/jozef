'use client';

import { useMemo, useState } from 'react';
import type { PopupSettings } from '@/lib/popupService';

type Props = { settings: PopupSettings | null };

function sanitizeRichText(source: string) {
  return source
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/&lt;(\/?)strong&gt;/gi, '<$1strong>')
    .replace(/&lt;(\/?)em&gt;/gi, '<$1em>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}

export default function ManagedPopup({ settings }: Props) {
  const [dismissedVersion, setDismissedVersion] = useState<number | null>(null);
  const safeContent = useMemo(() => sanitizeRichText(settings?.content ?? ''), [settings?.content]);

  if (!settings?.enabled || !safeContent || dismissedVersion === settings.version) return null;

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="managed-popup-title">
      <section className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-7 text-slate-100 shadow-2xl">
        <h2 id="managed-popup-title" className="sr-only">Tájékoztató üzenet</h2>
        <button
          type="button"
          onClick={() => setDismissedVersion(settings.version)}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-slate-700 text-lg text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label="Popup bezárása"
        >
          ✕
        </button>
        <div
          className="whitespace-pre-wrap break-words pr-8 leading-relaxed"
          style={{ fontSize: `${settings.fontSize}px` }}
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
        <div className="mt-6 text-right">
          <button type="button" onClick={() => setDismissedVersion(settings.version)} className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold hover:bg-sky-500">
            Bezárás
          </button>
        </div>
      </section>
    </div>
  );
}
