'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  addProjectNote,
  deleteProjectAttachment,
  type ProjectAttachment,
  subscribeToProjectAttachments,
  uploadProjectImage,
} from '../../lib/projectAttachments';
import {
  type Project,
  subscribeToCompanyProjects,
} from '../../lib/projectService';

function readableSize(size?: number) {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjectDocumentsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => subscribeToCompanyProjects('', (items) => {
    setProjects(items);
    setProjectId((current) => current || items[0]?.id || '');
  }), []);

  useEffect(() => {
    if (!projectId) {
      setAttachments([]);
      return;
    }

    return subscribeToProjectAttachments(projectId, setAttachments);
  }, [projectId]);

  const project = useMemo(
    () => projects.find((item) => item.id === projectId) ?? null,
    [projects, projectId],
  );

  const notes = attachments.filter((item) => item.type === 'note');
  const images = attachments.filter((item) => item.type === 'image');

  async function saveNote(event: React.FormEvent) {
    event.preventDefault();
    if (!projectId || !note.trim()) return;

    setSaving(true);
    setError('');
    try {
      await addProjectNote(projectId, note);
      setNote('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'A jegyzet mentése sikertelen.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !projectId) return;

    setSaving(true);
    setError('');
    try {
      await uploadProjectImage(projectId, file);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'A kép feltöltése sikertelen.');
    } finally {
      setSaving(false);
    }
  }

  async function removeAttachment(attachment: ProjectAttachment) {
    if (!projectId || !window.confirm('Biztosan törlöd ezt az elemet?')) return;

    setSaving(true);
    setError('');
    try {
      await deleteProjectAttachment(projectId, attachment);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'A törlés sikertelen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">Envision CRM</p>
            <h1 className="mt-1 text-2xl font-bold">Projektjegyzetek és képek</h1>
            <p className="mt-1 text-sm text-slate-500">Minden feljegyzés és helyszíni kép a kiválasztott projekthez kerül.</p>
          </div>
          <Link href="/" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
            ← Vissza a projektekhez
          </Link>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Projekt</label>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500"
          >
            {projects.length === 0 && <option value="">Nincs elérhető projekt</option>}
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {item.title} · {item.client.name}
              </option>
            ))}
          </select>
          {project && (
            <p className="mt-3 text-sm text-slate-400">
              {project.client.address || 'Nincs cím megadva'}
            </p>
          )}
        </section>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Szöveges jegyzetek</h2>
                <p className="mt-1 text-sm text-slate-500">Mérés, egyeztetés, helyszíni megjegyzés vagy belső információ.</p>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">{notes.length}</span>
            </div>

            <form onSubmit={saveNote} className="mt-5 space-y-3">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Írj jegyzetet a projekthez…"
                rows={5}
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500"
              />
              <button
                disabled={saving || !projectId || !note.trim()}
                className="w-full rounded-lg bg-sky-600 px-4 py-3 font-semibold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Mentés…' : 'Jegyzet hozzáadása'}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {notes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Még nincs szöveges jegyzet.</p>
              ) : notes.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{item.text}</p>
                  <button
                    onClick={() => removeAttachment(item)}
                    disabled={saving}
                    className="mt-3 text-xs font-semibold text-rose-400 hover:text-rose-300"
                  >
                    Törlés
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Projektképek</h2>
                <p className="mt-1 text-sm text-slate-500">Helyszíni fotók, részletek, hibák és elkészült munkák.</p>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">{images.length}</span>
            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-8 text-center transition hover:border-sky-500 hover:bg-sky-500/5">
              <span className="text-3xl">＋</span>
              <span className="mt-2 font-semibold">Kép feltöltése</span>
              <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP · legfeljebb 15 MB</span>
              <input
                type="file"
                accept="image/*"
                disabled={saving || !projectId}
                onChange={uploadImage}
                className="hidden"
              />
            </label>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {images.length === 0 ? (
                <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Még nincs feltöltött kép.</p>
              ) : images.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60">
                  {item.downloadURL && (
                    <a href={item.downloadURL} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.downloadURL} alt={item.fileName || 'Projektkép'} className="h-44 w-full object-cover" />
                    </a>
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{item.fileName}</p>
                    <p className="mt-1 text-xs text-slate-500">{readableSize(item.size)}</p>
                    <button
                      onClick={() => removeAttachment(item)}
                      disabled={saving}
                      className="mt-3 text-xs font-semibold text-rose-400 hover:text-rose-300"
                    >
                      Törlés
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 opacity-60">
            <h2 className="font-bold">Videó</h2>
            <p className="mt-1 text-sm text-slate-500">Előkészítve, későbbi fejlesztésben aktiváljuk.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 opacity-60">
            <h2 className="font-bold">Hangjegyzet</h2>
            <p className="mt-1 text-sm text-slate-500">Előkészítve, későbbi fejlesztésben aktiváljuk.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
