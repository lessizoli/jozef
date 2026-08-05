import type { DashboardView } from './types';

type Props = {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onCreate: () => void;
  onSignOut: () => void;
};

export default function DashboardHeader({ view, onViewChange, onCreate, onSignOut }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">Envision CRM</p>
          <h1 className="mt-1 text-xl font-bold">Projektkezelő</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Fő navigáció">
          <button
            type="button"
            onClick={() => onViewChange('projects')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'projects' ? 'bg-sky-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
          >
            Projektek
          </button>
          <button
            type="button"
            onClick={() => onViewChange('calendar')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'calendar' ? 'bg-sky-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
          >
            Naptár
          </button>
          <button type="button" onClick={onCreate} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">
            + Új érdeklődés
          </button>
          <button type="button" onClick={onSignOut} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Kilépés
          </button>
        </nav>
      </div>
    </header>
  );
}
