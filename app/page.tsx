'use client';

import { signOut } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import CalendarDialog from '@/components/dashboard/CalendarDialog';
import CalendarView from '@/components/dashboard/CalendarView';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
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
  InquiryForm,
  ProjectDetailsDraft,
  ScheduleDraft,
} from '@/components/dashboard/types';
import { auth } from '@/lib/firebase';
import {
  closeProject,
  createNewInquiry,
  type ModuleKey,
  type Project,
  subscribeToCompanyProjects,
  updateProjectDetails,
  updateProjectModuleSchedule,
  updateProjectModuleStatus,
} from '@/lib/projectService';
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

const emptyInquiry: InquiryForm = { title: '', clientName: '', address: '', phone: '' };
const emptySchedule: ScheduleDraft = { date: '', time: '', assignedTo: '', assigneeId: '', assigneeType: '' };
const emptyDetails: ProjectDetailsDraft = { title: '', clientName: '', email: '', phone: '', address: '' };

type DrawerIntent = ProjectDrawerMode | 'close';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'A művelet nem sikerült.';
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('survey');
  const [drawerIntent, setDrawerIntent] = useState<DrawerIntent>('module');
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(emptySchedule);
  const [detailsDraft, setDetailsDraft] = useState<ProjectDetailsDraft>(emptyDetails);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [view, setView] = useState<DashboardView>('projects');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarDraft, setCalendarDraft] = useState<CalendarDraft | null>(null);
  const [inquiryForm, setInquiryForm] = useState<InquiryForm>(emptyInquiry);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [teams, setTeams] = useState<CompanyTeam[]>([]);
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [canManageTeam, setCanManageTeam] = useState(false);

  useEffect(() => subscribeToCompanyProjects('', (items) => {
    setProjects(items);
    setSelectedProject((current) => current ? items.find((item) => item.id === current.id) ?? null : null);
  }), []);

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    let cancelled = false;
    void ensureCurrentMember().then((context) => {
      if (cancelled) return;
      setCanManageTeam(context.canManage);
      unsubscribers.push(
        subscribeToMembers(context.companyId, setMembers),
        subscribeToTeams(context.companyId, setTeams),
        subscribeToInvites(context.companyId, setInvites),
      );
    }).catch((error) => setActionError(errorMessage(error)));
    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const activeProjects = useMemo(() => projects.filter((project) => !project.closed), [projects]);
  const delayedCount = useMemo(
    () => activeProjects.filter((project) => project.status === 'Csúszás').length,
    [activeProjects],
  );
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

  const monthTitle = calendarMonth.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
  const calendarDraftProject = calendarDraft
    ? projects.find((project) => project.id === calendarDraft.projectId) ?? null
    : null;

  async function runAction(action: () => Promise<void>) {
    setActionError('');
    setSaving(true);
    try {
      await action();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inquiryForm.title.trim() || !inquiryForm.clientName.trim()) return;
    await runAction(async () => {
      await createNewInquiry('', inquiryForm.title, inquiryForm.clientName, inquiryForm.address, inquiryForm.phone);
      setInquiryForm(emptyInquiry);
      setShowCreate(false);
    });
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
    });
  }

  function openModule(project: Project, key: ModuleKey) {
    if (project.closed || !project.modules[key].enabled) return;
    setActionError('');
    setDrawerIntent('module');
    setSelectedModule(key);
    loadScheduleDraft(project, key);
    loadDetailsDraft(project);
    setSelectedProject(project);
  }

  function openProjectDetails(project: Project) {
    setActionError('');
    setDrawerIntent('details');
    loadDetailsDraft(project);
    setSelectedProject(project);
  }

  function requestProjectClose(project: Project) {
    setActionError('');
    setDrawerIntent('close');
    loadDetailsDraft(project);
    setSelectedProject(project);
  }

  function changeSelectedModule(key: ModuleKey) {
    if (!selectedProject) return;
    setSelectedModule(key);
    loadScheduleDraft(selectedProject, key);
  }

  function openCalendarDraft(date: string) {
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <DashboardHeader
        view={view}
        onViewChange={setView}
        onCreate={() => setShowCreate(true)}
        onSignOut={() => void signOut(auth)}
      />

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-6">
        {actionError && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200" role="alert">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError('')} aria-label="Hibaüzenet bezárása">✕</button>
          </div>
        )}
        <DashboardStats
          activeProjects={activeProjects.length}
          delayedProjects={delayedCount}
          calendarEvents={calendarEvents.length}
        />

        {view === 'projects' ? (
          <ProjectList
            projects={projects}
            onCreate={() => setShowCreate(true)}
            onOpenModule={openModule}
            onEditProject={openProjectDetails}
            onCloseProject={requestProjectClose}
          />
        ) : view === 'calendar' ? (
          <CalendarView
            monthTitle={monthTitle}
            days={calendarDays}
            events={calendarEvents}
            hasActiveProject={activeProjects.length > 0}
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
            canManage={canManageTeam}
            saving={saving}
            onInvite={handleInvite}
            onMemberUpdate={handleMemberUpdate}
            onTeamCreate={handleTeamCreate}
            onTeamUpdate={handleTeamUpdate}
            onTeamDelete={handleTeamDelete}
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

      {selectedProject && (
        <ProjectDrawer
          key={`${selectedProject.id}-${drawerIntent}`}
          project={selectedProject}
          selectedModule={selectedModule}
          initialMode={drawerIntent === 'module' ? 'module' : 'details'}
          initialConfirmClose={drawerIntent === 'close'}
          schedule={scheduleDraft}
          details={detailsDraft}
          saving={saving}
          assignmentOptions={assignmentOptions}
          onModuleChange={changeSelectedModule}
          onScheduleChange={setScheduleDraft}
          onDetailsChange={setDetailsDraft}
          onStatusChange={changeModuleStatus}
          onSaveSchedule={saveSelectedSchedule}
          onSaveDetails={saveProjectDetails}
          onCloseProject={confirmCloseProject}
          onDismiss={() => setSelectedProject(null)}
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
