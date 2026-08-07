'use client';

import { useRef, useState } from 'react';
import {
  popupFontSizes,
  type PopupSettings,
} from '@/lib/popupService';

type Props = {
  settings: PopupSettings;
  canManage: boolean;
  saving: boolean;
  onSave: (settings: PopupSettings) => Promise<void>;
};

function insertMarkup(
  element: HTMLTextAreaElement,
  value: string,
  before: string,
  after: string,
) {
  const start = element.selectionStart;
  const end = element.selectionEnd;
  const selected = value.slice(start, end) || 'formázott szöveg';
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  return { next, cursorStart: start + before.length, cursorEnd: start + before.length + selected.length };
}

export default function PopupSettingsPanel({ settings, canManage, saving, onSave }: Props) {
  const [draft, setDraft] = useState(settings);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function format(before: string, after: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const result = insertMarkup(textarea, draft.content, before, after);
    setDraft((current) => ({ ...current, content: result.next }));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorStart, result.cursorEnd);
    });
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Weboldal</p>
          <h2 className="mt-1 text-xl font-bold">Popup ablak</h2>
          <p className="mt-2 text-sm text-slate-400">A bekapcsolt üzenet minden bejelentkezett felhasználónak megjelenik.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
          <input
            type="checkbox"
            checked={draft.enabled}
            disabled={!canManage}
            onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
            className="h-5 w-5 accent-sky-500"
          />
          <span className="text-sm font-semibold">{draft.enabled ? 'Bekapcsolva' : 'Kikapcsolva'}</span>
        </label>
      </div>

      <div className="mt-6 space-y-3">
        <label htmlFor="popup-content" className="block text-sm font-semibold text-slate-200">Popup szövege</label>
        <div className="flex flex-wrap gap-2" aria-label="Szövegformázás">
          <button type="button" disabled={!canManage} onClick={() => format('<strong>', '</strong>')} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-bold hover:bg-slate-800 disabled:opacity-50">Félkövér</button>
          <button type="button" disabled={!canManage} onClick={() => format('<em>', '</em>')} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm italic hover:bg-slate-800 disabled:opacity-50">Dőlt</button>
          <button type="button" disabled={!canManage} onClick={() => format('<br>\n', '')} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50">Új sor</button>
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
            Betűméret
            <select
              value={draft.fontSize}
              disabled={!canManage}
              onChange={(event) => setDraft((current) => ({ ...current, fontSize: Number(event.target.value) as PopupSettings['fontSize'] }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5"
            >
              {popupFontSizes.map((size) => <option key={size} value={size}>{size} px</option>)}
            </select>
          </label>
        </div>
        <textarea
          ref={textareaRef}
          id="popup-content"
          rows={8}
          maxLength={5000}
          disabled={!canManage}
          value={draft.content}
          onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
          placeholder="Írd ide a látogatóknak szánt üzenetet…"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none focus:border-sky-500 disabled:opacity-60"
        />
        <p className="text-xs text-slate-500">A formázógombok a kijelölt szöveget formázzák. Legfeljebb 5000 karakter.</p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        {!canManage && <p className="text-sm text-amber-300">A beállítást csak céges adminisztrátor módosíthatja.</p>}
        <button
          type="button"
          disabled={!canManage || saving || (draft.enabled && !draft.content.trim())}
          onClick={() => void onSave(draft)}
          className="ml-auto rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {saving ? 'Mentés…' : 'Beállítás mentése'}
        </button>
      </div>
    </section>
  );
}
