import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { DashboardView } from './types';

type ActivePage = DashboardView | 'documents' | 'project';
type Props = { view?: ActivePage; onViewChange?: (view: DashboardView) => void; onCreate?: () => void; onSignOut?: () => void };
export default function DashboardHeader({ view = 'projects', onViewChange, onCreate, onSignOut }: Props) {
  const dashboardItem = (target: DashboardView, label: string) => onViewChange
    ? <button type="button" onClick={() => onViewChange(target)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === target ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</button>
    : <Link href={`/${target === 'projects' ? '' : `?view=${target}`}`} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === target ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</Link>;
  return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-5 px-5 py-3.5">
    <div className="mr-4 min-w-44"><p className="text-[11px] font-bold uppercase tracking-[.25em] text-sky-600">Envision CRM</p><h1 className="mt-0.5 text-lg font-bold text-slate-800">Projektkezelő</h1></div>
    <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto lg:order-none lg:w-auto lg:flex-1" aria-label="Fő navigáció">{dashboardItem('projects', 'Projektek')}{dashboardItem('calendar', 'Naptár')}{dashboardItem('team', 'Munkatársak')}<Link href="/dokumentumok" className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === 'documents' ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50'}`}>Dokumentumok</Link></nav>
    <div className="ml-auto flex items-center gap-2">{onCreate ? <button type="button" onClick={onCreate} className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500">+ Új projekt</button> : <Link href="/?create=1" className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500">+ Új projekt</Link>}<button type="button" onClick={onSignOut ?? (() => { void signOut(auth); })} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">Kilépés</button></div>
  </div></header>;
}
