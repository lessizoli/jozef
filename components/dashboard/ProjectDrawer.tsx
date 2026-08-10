import { useState } from 'react';
import Link from 'next/link';
import { getProjectModuleDisplayStatus, type ModuleKey, type Project } from '@/lib/projectService';
import { moduleKeys, moduleLabels, moduleStatuses } from './dashboardConfig';
import ContractEditor from './ContractEditor';
import QuoteEditor from './QuoteEditor';
import ConstructionEditor from './ConstructionEditor';
import CompletionEditor from './CompletionEditor';
import FinanceEditor from './FinanceEditor';
import type { AssignmentOption, ContractDraft, ProjectDetailsDraft, QuoteDraft, ScheduleDraft } from './types';

export type ProjectDrawerMode = 'module' | 'quote' | 'contract' | 'construction' | 'completion' | 'finance' | 'details';

type Props = {
  project: Project;
  selectedModule: ModuleKey;
  initialMode: ProjectDrawerMode;
  initialConfirmClose: boolean;
  schedule: ScheduleDraft;
  details: ProjectDetailsDraft;
  quote: QuoteDraft;
  contract: ContractDraft;
  saving: boolean;
  canEditProject: boolean;
  assignmentOptions: AssignmentOption[];
  onModuleChange: (moduleKey: ModuleKey) => void;
  onScheduleChange: (schedule: ScheduleDraft) => void;
  onDetailsChange: (details: ProjectDetailsDraft) => void;
  onQuoteChange: (quote: QuoteDraft) => void;
  onContractChange: (contract: ContractDraft) => void;
  onStatusChange: (status: string) => void;
  onSaveSchedule: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveDetails: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveQuote: () => void;
  onDownloadQuote: () => void;
  onSendQuote: () => void;
  onAcceptQuote: () => void;
  onRejectQuote: () => void;
  onSaveContract: () => void;
  onDownloadContract: () => void;
  onSendContract: () => void;
  onSignContract: () => void;
  onRejectContract: () => void;
  onUploadSignedContract: (file: File) => void;
  onDownloadSignedContract: () => void;
  onCloseProject: () => void;
  onDismiss: () => void;
  onConstructionAction: (action: () => Promise<void>, message: string) => void;
};

export default function ProjectDrawer({
  project,
  selectedModule,
  initialMode,
  initialConfirmClose,
  schedule,
  details,
  quote,
  contract,
  saving,
  canEditProject,
  assignmentOptions,
  onModuleChange,
  onScheduleChange,
  onDetailsChange,
  onQuoteChange,
  onContractChange,
  onStatusChange,
  onSaveSchedule,
  onSaveDetails,
  onSaveQuote,
  onDownloadQuote,
  onSendQuote,
  onAcceptQuote,
  onRejectQuote,
  onSaveContract,
  onDownloadContract,
  onSendContract,
  onSignContract,
  onRejectContract,
  onUploadSignedContract,
  onDownloadSignedContract,
  onCloseProject,
  onDismiss,
  onConstructionAction,
}: Props) {
  const [mode, setMode] = useState<ProjectDrawerMode>(initialMode);
  const [confirmingClose, setConfirmingClose] = useState(initialConfirmClose);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onDismiss}>
      <aside className={`h-full w-full overflow-y-auto bg-slate-900 p-4 shadow-2xl sm:p-6 ${mode === 'quote' ? 'max-w-none' : 'max-w-md border-l border-slate-700'}`} onClick={(event) => event.stopPropagation()}>
        <div className={mode === 'quote' ? 'mx-auto max-w-7xl' : ''}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-slate-500">{project.code}</p>
              {project.closed && <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-400">Lezárt</span>}
            </div>
            <h2 className="mt-1 text-xl font-bold">{project.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{project.client.name}</p>
          </div>
          <button type="button" onClick={onDismiss} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-400" aria-label="Bezárás">✕</button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => setMode('module')} className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === 'module' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'}`}>
            Folyamat kezelése
          </button>
          <button type="button" disabled={!project.modules.quote.enabled} onClick={() => setMode('quote')} className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === 'quote' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'} disabled:cursor-not-allowed disabled:opacity-40`}>
            Ajánlat
          </button>
          <button type="button" disabled={!project.modules.contract.enabled} onClick={() => setMode('contract')} className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === 'contract' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'} disabled:cursor-not-allowed disabled:opacity-40`}>
            Szerződés
          </button>
          <button type="button" disabled={!project.modules.construction.enabled} onClick={() => setMode('construction')} className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === 'construction' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'} disabled:cursor-not-allowed disabled:opacity-40`}>
            Kivitelezés
          </button>
          <button type="button" disabled={!project.modules.completion.enabled} onClick={() => setMode('completion')} className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === 'completion' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'} disabled:cursor-not-allowed disabled:opacity-40`}>
            Befejezés
          </button>
          <button type="button" disabled={!project.modules.finance.enabled} onClick={() => setMode('finance')} className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === 'finance' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'} disabled:cursor-not-allowed disabled:opacity-40`}>
            Pénzügy
          </button>
          <button type="button" onClick={() => setMode('details')} className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === 'details' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'}`}>
            Projektadatok
          </button>
          <Link href={`/dokumentumok?project=${encodeURIComponent(project.id)}`} className="rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-400 hover:border-sky-500 hover:text-sky-300">
            Projektanyagok
          </Link>
        </div>

        {mode === 'module' ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {moduleKeys.map((key) => (
                <button
                  type="button"
                  key={key}
                  disabled={project.closed || !project.modules[key].enabled}
                  onClick={() => {
                    onModuleChange(key);
                    if (key === 'quote') setMode('quote');
                    if (key === 'contract') setMode('contract');
                    if (key === 'construction') setMode('construction');
                    if (key === 'completion') setMode('completion');
                    if (key === 'finance') setMode('finance');
                  }}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${selectedModule === key ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {moduleLabels[key]}
                </button>
              ))}
            </div>
            {project.closed ? (
              <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
                A lezárt projekt folyamatai már nem módosíthatók.
              </div>
            ) : (
              <form onSubmit={onSaveSchedule} className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Kiválasztott modul</p>
                <h3 className="mt-1 text-lg font-bold">{moduleLabels[selectedModule]}</h3>
                <p className="mt-2 text-sm text-slate-400">Jelenlegi státusz: <span className="font-semibold text-slate-200">{getProjectModuleDisplayStatus(project, selectedModule)}</span></p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Dátum</label>
                    <input type="date" value={schedule.date} onChange={(event) => onScheduleChange({ ...schedule, date: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Kezdési idő</label>
                    <input type="time" value={schedule.time} onChange={(event) => onScheduleChange({ ...schedule, time: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Felelős munkatárs / csapat</label>
                  <select
                    value={schedule.assigneeId ? `${schedule.assigneeType}:${schedule.assigneeId}` : ''}
                    onChange={(event) => {
                      const option = assignmentOptions.find((item) => `${item.type}:${item.id}` === event.target.value);
                      onScheduleChange({ ...schedule, assignedTo: option?.label ?? '', assigneeId: option?.id ?? '', assigneeType: option?.type ?? '' });
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  >
                    <option value="">Nincs hozzárendelve</option>
                    <optgroup label="Munkatársak">{assignmentOptions.filter((item) => item.type === 'member').map((item) => <option key={`member-${item.id}`} value={`member:${item.id}`}>{item.label}</option>)}</optgroup>
                    <optgroup label="Csapatok">{assignmentOptions.filter((item) => item.type === 'team').map((item) => <option key={`team-${item.id}`} value={`team:${item.id}`}>{item.label}</option>)}</optgroup>
                  </select>
                </div>
                <button disabled={saving} className="mt-3 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50">Időpont mentése</button>
                <div className="mt-5 space-y-2">
                  {moduleStatuses[selectedModule].map((status) => (
                    <button
                      type="button"
                      key={status}
                      disabled={saving || status === project.modules[selectedModule].status}
                      onClick={() => onStatusChange(status)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm hover:border-sky-500 disabled:opacity-40"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </form>
            )}
          </>
        ) : mode === 'quote' ? (
          project.closed ? (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
              A lezárt projekt ajánlata már nem módosítható.
            </div>
          ) : (
            <QuoteEditor
              draft={quote}
              clientEmail={project.client.email}
              saving={saving}
              onChange={onQuoteChange}
              onSave={onSaveQuote}
              onDownload={onDownloadQuote}
              onSend={onSendQuote}
              status={getProjectModuleDisplayStatus(project, 'quote')}
              decisionAt={project.modules.quote.statusChangedAt}
              canDecide={canEditProject}
              onAccept={onAcceptQuote}
              onReject={onRejectQuote}
            />
          )
        ) : mode === 'contract' ? (
          project.closed ? (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
              A lezárt projekt szerződése már nem módosítható.
            </div>
          ) : (
            <ContractEditor
              draft={contract}
              clientName={project.client.name}
              clientAddress={project.client.address}
              clientEmail={project.client.email}
              signedDocument={project.contractData?.signedDocument}
              signed={project.modules.contract.status === 'Aláírva' || Boolean(project.contractData?.signedAt)}
              signedAt={project.contractData?.signedAt}
              signedByName={project.contractData?.signedByName}
              quoteAccepted={project.modules.quote.enabled === false || project.modules.quote.status === 'Elfogadva'}
              hasSavedContract={Boolean(project.contractData?.contractNumber)}
              saving={saving}
              onChange={onContractChange}
              onSave={onSaveContract}
              onDownload={onDownloadContract}
              onSend={onSendContract}
              status={getProjectModuleDisplayStatus(project, 'contract')}
              decisionAt={project.modules.contract.statusChangedAt}
              canDecide={canEditProject}
              onSign={onSignContract}
              onReject={onRejectContract}
              onUploadSigned={onUploadSignedContract}
              onDownloadSigned={onDownloadSignedContract}
            />
          )
        ) : mode === 'construction' ? (
          project.closed ? (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">A lezárt projekt kivitelezése már nem módosítható.</div>
          ) : (
            <ConstructionEditor project={project} saving={saving} onRun={onConstructionAction} />
          )
        ) : mode === 'completion' ? (
          project.closed ? (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">A lezárt projekt átadási adatai már nem módosíthatók.</div>
          ) : (
            <CompletionEditor project={project} saving={saving} onRun={onConstructionAction} />
          )
        ) : mode === 'finance' ? (
          project.closed ? (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">A lezárt projekt pénzügyi adatai már nem módosíthatók.</div>
          ) : (
            <FinanceEditor project={project} saving={saving} onRun={onConstructionAction} />
          )
        ) : (
          <form onSubmit={onSaveDetails} className="mt-6 space-y-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Projekt megnevezése</label>
              <input required disabled={project.closed} value={details.title} onChange={(event) => onDetailsChange({ ...details, title: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Ügyfél neve</label>
              <input required disabled={project.closed} value={details.clientName} onChange={(event) => onDetailsChange({ ...details, clientName: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">E-mail-cím</label>
              <input type="email" disabled={project.closed} value={details.email} onChange={(event) => onDetailsChange({ ...details, email: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Telefonszám</label>
              <input disabled={project.closed} value={details.phone} onChange={(event) => onDetailsChange({ ...details, phone: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Helyszín / cím</label>
              <input disabled={project.closed} value={details.address} onChange={(event) => onDetailsChange({ ...details, address: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            {!project.closed && (
              <button disabled={saving} className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50">
                {saving ? 'Mentés…' : 'Projektadatok mentése'}
              </button>
            )}
          </form>
        )}

        {!project.closed && (
          <div className="mt-8 border-t border-slate-800 pt-6">
            {!confirmingClose ? (
              <button type="button" onClick={() => setConfirmingClose(true)} className="w-full rounded-lg border border-rose-500/50 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10">
                Projekt lezárása
              </button>
            ) : (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
                <p className="text-sm font-semibold text-rose-200">Biztosan lezárod ezt a projektet?</p>
                <p className="mt-1 text-xs text-rose-200/70">A projekt megmarad, de a folyamatai nem lesznek tovább módosíthatók.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setConfirmingClose(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Mégsem</button>
                  <button type="button" disabled={saving} onClick={onCloseProject} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold hover:bg-rose-500 disabled:opacity-50">Igen, lezárom</button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </aside>
    </div>
  );
}
