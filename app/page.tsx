'use client';

import { signOut } from 'firebase/auth';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import CalendarDialog from '@/components/dashboard/CalendarDialog';
import CalendarView from '@/components/dashboard/CalendarView';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import InquiryDrawer from '@/components/dashboard/InquiryDrawer';
import ProjectDrawer, { type ProjectDrawerMode } from '@/components/dashboard/ProjectDrawer';
import ProjectList from '@/components/dashboard/ProjectList';
import TeamManagement from '@/components/dashboard/TeamManagement';
import { getCalendarDays, moduleKeys } from '@/components/dashboard/dashboardConfig';
import type {
  CalendarDraft,
  CalendarEvent,
  AssignmentOption,
  DashboardView,
  ContractDraft,
  InquiryForm,
  ProjectDetailsDraft,
  QuoteDraft,
  ScheduleDraft,
  SurveyDraft,
} from '@/components/dashboard/types';
import { auth } from '@/lib/firebase';
import {
  closeProject,
  createNewInquiry,
  saveProjectSurvey,
  type ModuleKey,
  type Project,
  subscribeToCompanyProjects,
  updateProjectDetails,
  updateProjectModuleSchedule,
  updateProjectModuleStatus,
  warmProjectCreationContext,
} from '@/lib/projectService';
import { downloadProjectQuote, saveProjectQuote, sendProjectQuote } from '@/lib/quoteService';
import {
  downloadProjectContract,
  downloadSignedContract,
  saveProjectContract,
  sendProjectContract,
  uploadSignedContract,
} from '@/lib/contractService';
import {
  createTeam,
  deleteTeam,
  ensureCurrentMember,
  inviteCompanyMember,
  subscribeToInvites,
  subscribeToMembers,
  subscribeToTeams,
  type CompanyInvite,
  type CompanyMember,
  type CompanyTeam,
  type MemberRole,
  updateCompanyMember,
  updateTeam,
} from '@/lib/teamService';
import { defaultPermissionMatrix, modulePermissionKeys, savePermissionMatrix, subscribeToPermissionMatrix, type PermissionMatrix } from '@/lib/permissionService';
import { useI18n } from '@/lib/i18n';
import { subscribeToCompanyDetails } from '@/lib/companyService';

const emptyInquiry: InquiryForm = { title: '', clientName: '', address: '', country: 'HU', phone: '', initialTask: '', communicationLanguage: 'hu' };
const emptySchedule: ScheduleDraft = { date: '', time: '', assignedTo: '', assigneeId: '', assigneeType: '' };
const emptyDetails: ProjectDetailsDraft = { title: '', clientName: '', email: '', phone: '', address: '', country: 'HU', communicationLanguage: 'hu' };
const emptySurvey: SurveyDraft = { customerNeeds: '', siteConditions: '', measurements: '', notes: '' };

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyQuote(project: Project): QuoteDraft {
  const issueDate = new Date();
  const validUntil = new Date(issueDate);
  validUntil.setDate(validUntil.getDate() + 14);
  return {
    quoteNumber: `AJ-${project.code}`,
    issueDate: dateInputValue(issueDate),
    validUntil: dateInputValue(validUntil),
    items: [{
      id: `item-${Date.now()}`,
      category: 'material',
      description: '',
      quantity: 1,
      unit: 'db',
      unitPrice: 0,
      vatRate: 27,
    }],
    note: '',
  };
}

function createEmptyContract(project: Project, defaults?: Project['contractData']): ContractDraft {
  const issueDate = new Date();
  const startDate = new Date(issueDate);
  startDate.setDate(startDate.getDate() + 14);
  const completionDate = new Date(startDate);
  completionDate.setDate(completionDate.getDate() + 30);
  const quoteDescription = project.quoteData?.items
    .map((item) => item.description)
    .filter(Boolean)
    .join(', ');

  return {
    contractNumber: `SZ-${project.code}`,
    issueDate: dateInputValue(issueDate),
    contractorName: defaults?.contractorName ?? '',
    contractorAddress: defaults?.contractorAddress ?? '',
    contractorTaxNumber: defaults?.contractorTaxNumber ?? '',
    contractorRepresentative: defaults?.contractorRepresentative ?? '',
    clientTaxNumber: '',
    clientRepresentative: '',
    workDescription: quoteDescription
      ? `${project.title}: ${quoteDescription}`
      : project.title,
    grossAmount: project.quoteData?.grossTotal ?? 0,
    depositAmount: 0,
    paymentTerms: project.quoteData?.note || 'A vállalkozói díj a teljesítést követően, számla alapján fizetendő.',
    startDate: dateInputValue(startDate),
    completionDate: dateInputValue(completionDate),
    warrantyMonths: 12,
    additionalTerms: '',
  };
}

type DrawerIntent = ProjectDrawerMode | 'close';
type ProjectModuleDeepLink = { projectId: string; moduleKey: ModuleKey };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'A művelet nem sikerült.';
}

export default function Dashboard() {
  const { t, locale } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('survey');
  const [drawerIntent, setDrawerIntent] = useState<DrawerIntent>('module');
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(emptySchedule);
  const [surveyDraft, setSurveyDraft] = useState<SurveyDraft>(emptySurvey);
  const [detailsDraft, setDetailsDraft] = useState<ProjectDetailsDraft>(emptyDetails);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft | null>(null);
  const [contractDraft, setContractDraft] = useState<ContractDraft | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [view, setView] = useState<DashboardView>('projects');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarDraft, setCalendarDraft] = useState<CalendarDraft | null>(null);
  const [inquiryForm, setInquiryForm] = useState<InquiryForm>(emptyInquiry);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [teams, setTeams] = useState<CompanyTeam[]>([]);
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [userRole, setUserRole] = useState<MemberRole | 'superadmin' | 'admin'>('installer');
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(defaultPermissionMatrix);
  const [projectModuleDeepLink, setProjectModuleDeepLink] = useState<ProjectModuleDeepLink | null>(null);
  const [companyDefaultLanguage, setCompanyDefaultLanguage] = useState<'hu' | 'de'>('hu');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get('view');
      if (requested === 'calendar' || requested === 'team') setView(requested);
      if (params.get('create') === '1') setShowCreate(true);
      const projectId = params.get('project');
      const moduleKey = params.get('module');
      if (projectId && moduleKey && moduleKeys.includes(moduleKey as ModuleKey)) {
        setProjectModuleDeepLink({ projectId, moduleKey: moduleKey as ModuleKey });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => subscribeToCompanyProjects('', (items) => {
    setProjects(items);
    setSelectedProject((current) => current ? items.find((item) => item.id === current.id) ?? null : null);
  }), []);
  useEffect(() => subscribeToCompanyDetails((details) => setCompanyDefaultLanguage(details.defaultLanguage)), []);

  useEffect(() => { void warmProjectCreationContext().catch(() => undefined); }, []);
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    let cancelled = false;
    void ensureCurrentMember().then((context) => {
      if (cancelled) return;
      setCanManageTeam(context.canManage);
      setUserRole(context.role as MemberRole | 'superadmin' | 'admin');
      unsubscribers.push(
        subscribeToMembers(context.companyId, setMembers),
        subscribeToTeams(context.companyId, setTeams),
        subscribeToInvites(context.companyId, setInvites),
        subscribeToPermissionMatrix(context.companyId, setPermissionMatrix),
      );
    }).catch((error) => setActionError(errorMessage(error)));
    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const activeProjects = useMemo(() => projects.filter((project) => !project.closed), [projects]);
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const calendarEvents = useMemo<CalendarEvent[]>(() => activeProjects
    .flatMap((project) => moduleKeys.flatMap((moduleKey) => {
      const projectModule = project.modules[moduleKey];
      if (!projectModule.scheduledAt) return [];
      return [{
        project,
        moduleKey,
        date: projectModule.scheduledAt,
        time: projectModule.scheduledTime ?? '',
        assignedTo: projectModule.assignedTo ?? '',
      }];
    }))
    .sort((a, b) => a.time.localeCompare(b.time)), [activeProjects]);
  const assignmentOptions = useMemo<AssignmentOption[]>(() => [
    ...members.filter((member) => member.active).map((member) => ({ id: member.uid, type: 'member' as const, label: member.fullName })),
    ...teams.filter((team) => team.active).map((team) => ({ id: team.id, type: 'team' as const, label: team.name })),
  ], [members, teams]);
  const rolePermissions = userRole in permissionMatrix ? permissionMatrix[userRole as MemberRole] : defaultPermissionMatrix.company_admin;
  const moduleAccess = Object.fromEntries(moduleKeys.map((key) => [key, rolePermissions[modulePermissionKeys[key]]])) as Record<ModuleKey, boolean>;

  const monthTitle = calendarMonth.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
  const calendarDraftProject = calendarDraft
    ? projects.find((project) => project.id === calendarDraft.projectId) ?? null
    : null;

  async function runAction(action: () => Promise<void>) {
    setActionError('');
    setActionMessage('');
    setSaving(true);
    try {
      await action();
    } catch (error) {
      setActionError(t(errorMessage(error)));
    } finally {
      setSaving(false);
    }
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rolePermissions.createProjects) return;
    if (!inquiryForm.title.trim() || !inquiryForm.clientName.trim()) return;
    const submitted = inquiryForm;
    setInquiryForm(emptyInquiry);
    setShowCreate(false);
    await runAction(async () => {
      try {
        await createNewInquiry('', submitted.title, submitted.clientName, submitted.address, submitted.phone, submitted.initialTask, submitted.communicationLanguage, submitted.country);
        setActionMessage(t('Az új projekt létrejött.'));
      } catch (error) {
        setInquiryForm(submitted);
        setShowCreate(true);
        throw error;
      }
    });
  }

  function openCreateProject() {
    if (!rolePermissions.createProjects) return;
    setInquiryForm((current) => current.title || current.clientName ? current : { ...current, communicationLanguage: companyDefaultLanguage });
    setShowCreate(true);
  }

  async function changeModuleStatus(status: string) {
    if (!selectedProject) return;
    await runAction(() => updateProjectModuleStatus(selectedProject.id, selectedModule, status));
  }

  async function saveSelectedSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    await runAction(() => updateProjectModuleSchedule(selectedProject.id, selectedModule, {
      date: scheduleDraft.date || null,
      time: scheduleDraft.time || null,
      assignedTo: scheduleDraft.assignedTo.trim() || null,
      assigneeId: scheduleDraft.assigneeId || null,
      assigneeType: scheduleDraft.assigneeType || null,
    }));
  }

  async function saveProjectDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    await runAction(() => updateProjectDetails(selectedProject.id, detailsDraft));
  }

  async function confirmCloseProject() {
    if (!selectedProject) return;
    await runAction(async () => {
      await closeProject(selectedProject.id);
      setSelectedProject(null);
    });
  }

  function loadScheduleDraft(project: Project, key: ModuleKey) {
    const projectModule = project.modules[key];
    setScheduleDraft({
      date: projectModule.scheduledAt ?? '',
      time: projectModule.scheduledTime ?? '',
      assignedTo: projectModule.assignedTo ?? '',
      assigneeId: projectModule.assigneeId ?? '',
      assigneeType: projectModule.assigneeType ?? '',
    });
  }

  function loadDetailsDraft(project: Project) {
    setDetailsDraft({
      title: project.title,
      clientName: project.client.name,
      email: project.client.email,
      phone: project.client.phone,
      address: project.client.address,
      country: project.country,
      communicationLanguage: project.communicationLanguage,
    });
  }

  function loadSurveyDraft(project: Project) {
    setSurveyDraft(project.surveyData ?? emptySurvey);
  }

  function loadQuoteDraft(project: Project) {
    const quote = project.quoteData;
    setQuoteDraft(quote ? {
      quoteNumber: quote.quoteNumber,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
      items: quote.items.map((item) => ({ ...item })),
      note: quote.note,
    } : createEmptyQuote(project));
  }

  function loadContractDraft(project: Project) {
    const contract = project.contractData;
    const companyDefaults = projects.find((item) => item.contractData?.contractorName)?.contractData;
    setContractDraft(contract ? {
      contractNumber: contract.contractNumber,
      issueDate: contract.issueDate,
      contractorName: contract.contractorName,
      contractorAddress: contract.contractorAddress,
      contractorTaxNumber: contract.contractorTaxNumber,
      contractorRepresentative: contract.contractorRepresentative,
      clientTaxNumber: contract.clientTaxNumber,
      clientRepresentative: contract.clientRepresentative,
      workDescription: contract.workDescription,
      grossAmount: contract.grossAmount,
      depositAmount: contract.depositAmount,
      paymentTerms: contract.paymentTerms,
      startDate: contract.startDate,
      completionDate: contract.completionDate,
      warrantyMonths: contract.warrantyMonths,
      additionalTerms: contract.additionalTerms,
    } : createEmptyContract(project, companyDefaults));
  }

  function openModule(project: Project, key: ModuleKey) {
    if (project.closed || !project.modules[key].enabled || !moduleAccess[key]) return;
    setActionError('');
    setDrawerIntent(key === 'survey' ? 'survey' : key === 'quote' ? 'quote' : key === 'contract' ? 'contract' : key === 'construction' ? 'construction' : key === 'completion' ? 'completion' : key === 'finance' ? 'finance' : 'module');
    setSelectedModule(key);
    loadScheduleDraft(project, key);
    loadSurveyDraft(project);
    loadDetailsDraft(project);
    loadQuoteDraft(project);
    loadContractDraft(project);
    setSelectedProject(project);
  }

  const openModuleFromDeepLink = useEffectEvent(openModule);

  useEffect(() => {
    if (!projectModuleDeepLink || projects.length === 0) return;
    const timer = window.setTimeout(() => {
      const project = projects.find((item) => item.id === projectModuleDeepLink.projectId);
      if (!project) {
        setActionError('A hivatkozott projekt nem található.');
        setProjectModuleDeepLink(null);
        return;
      }
      if (project.closed || !project.modules[projectModuleDeepLink.moduleKey].enabled) {
        setActionError('Ez a projektmodul jelenleg nem szerkeszthető.');
        setProjectModuleDeepLink(null);
        return;
      }
      openModuleFromDeepLink(project, projectModuleDeepLink.moduleKey);
      setProjectModuleDeepLink(null);
      window.history.replaceState(null, '', window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [projectModuleDeepLink, projects]);

  function openProjectDetails(project: Project) {
    if (!rolePermissions.editProjects) return;
    setActionError('');
    setDrawerIntent('details');
    loadDetailsDraft(project);
    loadSurveyDraft(project);
    loadQuoteDraft(project);
    loadContractDraft(project);
    setSelectedProject(project);
  }

  function requestProjectClose(project: Project) {
    if (!rolePermissions.editProjects) return;
    setActionError('');
    setDrawerIntent('close');
    loadDetailsDraft(project);
    loadSurveyDraft(project);
    loadQuoteDraft(project);
    loadContractDraft(project);
    setSelectedProject(project);
  }

  function changeSelectedModule(key: ModuleKey) {
    if (!selectedProject || !moduleAccess[key]) return;
    setSelectedModule(key);
    loadScheduleDraft(selectedProject, key);
  }

  async function saveSelectedQuote() {
    if (!selectedProject || !quoteDraft) return;
    await runAction(async () => {
      await saveProjectQuote(selectedProject, quoteDraft);
      setActionMessage('Az ajánlat mentve.');
    });
  }

  async function saveSelectedSurvey() {
    if (!selectedProject) return;
    await runAction(async () => {
      await saveProjectSurvey(selectedProject, surveyDraft);
      setActionMessage(selectedProject.modules.quote.enabled
        ? 'A felmérési űrlap mentve, a projekt átkerült az Árajánlat szakaszba.'
        : 'A felmérési űrlap mentve, a következő elérhető projektszakasz elindult.');
      setSelectedProject(null);
    });
  }

  async function downloadSelectedQuote() {
    if (!selectedProject || !quoteDraft) return;
    await runAction(async () => {
      await saveProjectQuote(selectedProject, quoteDraft);
      await downloadProjectQuote(selectedProject.id);
      setActionMessage('A PDF elkészült és letöltődött.');
    });
  }

  async function sendSelectedQuote() {
    if (!selectedProject || !quoteDraft) return;
    await runAction(async () => {
      await saveProjectQuote(selectedProject, quoteDraft);
      await sendProjectQuote(selectedProject.id);
      setActionMessage(t('Az ajánlat elküldve: {email}', { email: selectedProject.client.email }));
    });
  }

  async function decideSelectedQuote(status: 'Elfogadva' | 'Elutasítva') {
    if (!selectedProject || !quoteDraft) return;
    const consequence = status === 'Elfogadva'
      ? 'A Szerződés fázis automatikusan elindul.'
      : 'A projekt nem lép tovább a Szerződés fázisba.';
    if (!window.confirm(t('Biztosan {status} állapotú az ajánlat? {consequence}', { status: t(status).toLocaleLowerCase(locale), consequence: t(consequence) }))) return;
    await runAction(async () => {
      await saveProjectQuote(selectedProject, quoteDraft);
      await updateProjectModuleStatus(selectedProject.id, 'quote', status);
      setActionMessage(status === 'Elfogadva' ? 'Az ajánlat elfogadva, a Szerződés elindult.' : 'Az ajánlat elutasítva.');
    });
  }

  async function saveSelectedContract() {
    if (!selectedProject || !contractDraft) return;
    await runAction(async () => {
      await saveProjectContract(selectedProject.id, contractDraft);
      setActionMessage('A szerződés mentve.');
    });
  }

  async function downloadSelectedContract() {
    if (!selectedProject || !contractDraft) return;
    await runAction(async () => {
      await saveProjectContract(selectedProject.id, contractDraft);
      await downloadProjectContract(selectedProject.id);
      setActionMessage('A szerződés PDF elkészült és letöltődött.');
    });
  }

  async function sendSelectedContract() {
    if (!selectedProject || !contractDraft) return;
    await runAction(async () => {
      await saveProjectContract(selectedProject.id, contractDraft);
      await sendProjectContract(selectedProject.id);
      setActionMessage(t('A szerződés elküldve: {email}', { email: selectedProject.client.email }));
    });
  }

  async function decideSelectedContract(status: 'Aláírva' | 'Elutasítva') {
    if (!selectedProject || !contractDraft) return;
    const consequence = status === 'Aláírva'
      ? 'A Kivitelezés fázis automatikusan elindul.'
      : 'A projekt nem lép tovább a Kivitelezés fázisba.';
    if (!window.confirm(t('Biztosan {status} állapotú a szerződés? {consequence}', { status: t(status).toLocaleLowerCase(locale), consequence: t(consequence) }))) return;
    await runAction(async () => {
      await saveProjectContract(selectedProject.id, contractDraft);
      await updateProjectModuleStatus(selectedProject.id, 'contract', status);
      setActionMessage(status === 'Aláírva' ? 'A szerződés aláírva, a Kivitelezés elindult.' : 'A szerződés elutasítva.');
    });
  }

  async function uploadSelectedSignedContract(file: File) {
    if (!selectedProject) return;
    if (!window.confirm('A feltöltés után a szerződés Aláírva állapotú lesz, és elindul a Kivitelezés. Folytatod?')) return;
    await runAction(async () => {
      await uploadSignedContract(selectedProject, file);
      setActionMessage('Az aláírt szerződés feltöltve, a Kivitelezés elindult.');
    });
  }

  async function downloadSelectedSignedContract() {
    if (!selectedProject?.contractData?.signedDocument) return;
    await runAction(async () => {
      await downloadSignedContract(selectedProject.id);
      setActionMessage('Az aláírt szerződés letöltődött.');
    });
  }

  function openCalendarDraft(date: string) {
    if (!rolePermissions.manageCalendar) return;
    const firstProject = activeProjects[0];
    const firstModule = firstProject
      ? moduleKeys.find((key) => firstProject.modules[key].enabled) ?? 'survey'
      : 'survey';
    setCalendarDraft({
      date,
      time: '08:00',
      projectId: firstProject?.id ?? '',
      moduleKey: firstModule,
      assignedTo: '',
      assigneeId: '',
      assigneeType: '',
    });
  }

  function changeCalendarDraftProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    const moduleKey = project
      ? moduleKeys.find((key) => project.modules[key].enabled) ?? 'survey'
      : 'survey';
    setCalendarDraft((current) => current ? { ...current, projectId, moduleKey } : null);
  }

  async function saveCalendarDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rolePermissions.manageCalendar) return;
    if (!calendarDraft?.projectId || !calendarDraft.date || !calendarDraft.time) return;
    const project = projects.find((item) => item.id === calendarDraft.projectId);
    if (!project || project.closed || !project.modules[calendarDraft.moduleKey].enabled) return;

    await runAction(async () => {
      await updateProjectModuleSchedule(calendarDraft.projectId, calendarDraft.moduleKey, {
        date: calendarDraft.date,
        time: calendarDraft.time,
        assignedTo: calendarDraft.assignedTo.trim() || null,
        assigneeId: calendarDraft.assigneeId || null,
        assigneeType: calendarDraft.assigneeType || null,
      });
      setCalendarDraft(null);
    });
  }

  function moveMonth(offset: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function handleInvite(input: { fullName: string; email: string; role: MemberRole }) {
    return runAction(async () => { await inviteCompanyMember(input); });
  }

  function handleMemberUpdate(member: CompanyMember, role: MemberRole, active: boolean) {
    return runAction(async () => { await updateCompanyMember({ uid: member.uid, role, active }); });
  }

  function handleTeamCreate(name: string, memberIds: string[]) {
    return runAction(async () => { await createTeam(name, memberIds); });
  }

  function handleTeamUpdate(teamId: string, name: string, memberIds: string[]) {
    return runAction(async () => { await updateTeam(teamId, name, memberIds); });
  }

  function handleTeamDelete(teamId: string) {
    return runAction(async () => { await deleteTeam(teamId); });
  }

  function handlePermissionSave() {
    return runAction(async () => { await savePermissionMatrix(permissionMatrix); setActionMessage('A jogosultsági tábla mentve.'); });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <DashboardHeader
        view={view}
        onViewChange={setView}
        onCreate={openCreateProject}
        onSignOut={() => void signOut(auth)}
        canCreateProject={rolePermissions.createProjects}
      />

      <div className="mx-auto max-w-[1500px] space-y-7 px-5 py-7">
        {actionError && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800" role="alert">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError('')} aria-label="Hibaüzenet bezárása">✕</button>
          </div>
        )}
        {actionMessage && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">
            <span>{actionMessage}</span>
            <button type="button" onClick={() => setActionMessage('')} aria-label="Üzenet bezárása">✕</button>
          </div>
        )}
        {view === 'projects' ? (
          <><div><h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('Projektek')}</h2><p className="mt-1 text-sm text-slate-500">{t('A projektek automatikusan az aktuális munkaszakasz szerint rendezve jelennek meg.')}</p></div><ProjectList
            projects={projects}
            onCreate={openCreateProject}
            onOpenModule={openModule}
            onEditProject={openProjectDetails}
            onCloseProject={requestProjectClose}
            canCreate={rolePermissions.createProjects}
            canEdit={rolePermissions.editProjects}
            canManageDocuments={rolePermissions.manageDocuments}
            moduleAccess={moduleAccess}
          /></>
        ) : view === 'calendar' ? (
          <CalendarView
            monthTitle={monthTitle}
            days={calendarDays}
            events={calendarEvents}
            hasActiveProject={activeProjects.length > 0 && rolePermissions.manageCalendar}
            onAdd={openCalendarDraft}
            onMoveMonth={moveMonth}
            onToday={() => setCalendarMonth(new Date())}
            onOpenModule={openModule}
          />
        ) : (
          <TeamManagement
            members={members}
            teams={teams}
            invites={invites}
            canManageMembers={canManageTeam || rolePermissions.manageMembers}
            canManageTeams={canManageTeam || rolePermissions.manageTeams}
            canEditPermissions={canManageTeam}
            canEditCompany={canManageTeam || rolePermissions.manageCompany}
            saving={saving}
            onInvite={handleInvite}
            onMemberUpdate={handleMemberUpdate}
            onTeamCreate={handleTeamCreate}
            onTeamUpdate={handleTeamUpdate}
            onTeamDelete={handleTeamDelete}
            permissionMatrix={permissionMatrix}
            onPermissionChange={setPermissionMatrix}
            onPermissionSave={() => { void handlePermissionSave(); }}
          />
        )}
      </div>

      {calendarDraft && (
        <CalendarDialog
          draft={calendarDraft}
          projects={projects}
          selectedProject={calendarDraftProject}
          saving={saving}
          assignmentOptions={assignmentOptions}
          onChange={setCalendarDraft}
          onProjectChange={changeCalendarDraftProject}
          onClose={() => setCalendarDraft(null)}
          onSubmit={saveCalendarDraft}
        />
      )}

      {selectedProject && quoteDraft && contractDraft && (
        <ProjectDrawer
          key={`${selectedProject.id}-${drawerIntent}`}
          project={selectedProject}
          selectedModule={selectedModule}
          initialMode={drawerIntent === 'close' ? 'details' : drawerIntent}
          initialConfirmClose={drawerIntent === 'close'}
          schedule={scheduleDraft}
          survey={surveyDraft}
          details={detailsDraft}
          quote={quoteDraft}
          contract={contractDraft}
          saving={saving}
          actionError={actionError}
          actionMessage={actionMessage}
          canEditProject={rolePermissions.editProjects}
          assignmentOptions={assignmentOptions}
          onModuleChange={changeSelectedModule}
          onScheduleChange={setScheduleDraft}
          onSurveyChange={setSurveyDraft}
          onDetailsChange={setDetailsDraft}
          onQuoteChange={setQuoteDraft}
          onContractChange={setContractDraft}
          onStatusChange={changeModuleStatus}
          onSaveSchedule={saveSelectedSchedule}
          onSaveSurvey={saveSelectedSurvey}
          onSaveDetails={saveProjectDetails}
          onSaveQuote={saveSelectedQuote}
          onDownloadQuote={downloadSelectedQuote}
          onSendQuote={sendSelectedQuote}
          onAcceptQuote={() => { void decideSelectedQuote('Elfogadva'); }}
          onRejectQuote={() => { void decideSelectedQuote('Elutasítva'); }}
          onSaveContract={saveSelectedContract}
          onDownloadContract={downloadSelectedContract}
          onSendContract={sendSelectedContract}
          onSignContract={() => { void decideSelectedContract('Aláírva'); }}
          onRejectContract={() => { void decideSelectedContract('Elutasítva'); }}
          onUploadSignedContract={uploadSelectedSignedContract}
          onDownloadSignedContract={downloadSelectedSignedContract}
          onCloseProject={confirmCloseProject}
          onDismiss={() => setSelectedProject(null)}
          onConstructionAction={(action, message) => { void runAction(async () => { await action(); setActionMessage(message); }); }}
        />
      )}

      <InquiryDrawer
        open={showCreate}
        form={inquiryForm}
        saving={saving}
        onChange={setInquiryForm}
        onClose={() => setShowCreate(false)}
        onSubmit={createProject}
      />
    </main>
  );
}
