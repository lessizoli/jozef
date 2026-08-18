import { useState } from 'react';
import type { CompanyInvite, CompanyMember, CompanyTeam, MemberRole } from '@/lib/teamService';
import { roleLabels } from '@/lib/teamService';
import type { PermissionMatrix } from '@/lib/permissionService';
import PermissionMatrixEditor from './PermissionMatrixEditor';
import CompanyDetailsEditor from './CompanyDetailsEditor';
import { useI18n } from '@/lib/i18n';

type Props = {
  members: CompanyMember[];
  teams: CompanyTeam[];
  invites: CompanyInvite[];
  canManageMembers: boolean;
  canManageTeams: boolean;
  canEditPermissions: boolean;
  canEditCompany: boolean;
  saving: boolean;
  onInvite: (input: { fullName: string; email: string; role: MemberRole }) => Promise<void>;
  onMemberUpdate: (member: CompanyMember, role: MemberRole, active: boolean) => Promise<void>;
  onTeamCreate: (name: string, memberIds: string[]) => Promise<void>;
  onTeamUpdate: (teamId: string, name: string, memberIds: string[]) => Promise<void>;
  onTeamDelete: (teamId: string) => Promise<void>;
  permissionMatrix: PermissionMatrix;
  onPermissionChange: (matrix: PermissionMatrix) => void;
  onPermissionSave: () => void;
};

const roles = Object.keys(roleLabels) as MemberRole[];

export default function TeamManagement({ members, teams, invites, canManageMembers, canManageTeams, canEditPermissions, canEditCompany, saving, onInvite, onMemberUpdate, onTeamCreate, onTeamUpdate, onTeamDelete, permissionMatrix, onPermissionChange, onPermissionSave }: Props) {
  const { t } = useI18n();
  const [invite, setInvite] = useState<{ fullName: string; email: string; role: MemberRole }>({ fullName: '', email: '', role: 'installer' });
  const [teamName, setTeamName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  async function submitInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onInvite(invite);
    setInvite({ fullName: '', email: '', role: 'installer' });
  }

  async function submitTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onTeamCreate(teamName, selectedMembers);
    setTeamName('');
    setSelectedMembers([]);
  }

  function toggleMember(uid: string) {
    setSelectedMembers((current) => current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid]);
  }

  return (
    <section className="space-y-6">
      <CompanyDetailsEditor canEdit={canEditCompany} />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-bold">{t('Munkatársak')}</h2><p className="mt-1 text-sm text-slate-400">{t('{count} céges felhasználó', { count: members.length })}</p></div>
          </div>
          <div className="mt-5 space-y-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold">{member.fullName}</p><p className="text-xs text-slate-500">{member.email}</p></div>
                  <div className="flex gap-2">
                    <select disabled={!canManageMembers || saving} value={member.role} onChange={(event) => void onMemberUpdate(member, event.target.value as MemberRole, member.active)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs">
                      {roles.map((role) => <option key={role} value={role}>{t(roleLabels[role])}</option>)}
                    </select>
                    <button type="button" disabled={!canManageMembers || saving} onClick={() => void onMemberUpdate(member, member.role, !member.active)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${member.active ? 'border-emerald-500/50 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>
                      {t(member.active ? 'Aktív' : 'Inaktív')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {members.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">{t('Még nincs betöltött munkatárs.')}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">{t('Munkatárs meghívása')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('A meghívott e-mailben kap jelszóbeállító hivatkozást.')}</p>
          <form onSubmit={submitInvite} className="mt-5 space-y-3">
            <input required disabled={!canManageMembers} value={invite.fullName} onChange={(event) => setInvite({ ...invite, fullName: event.target.value })} placeholder={t('Teljes név')} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5" />
            <input required disabled={!canManageMembers} type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} placeholder={t('E-mail-cím')} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5" />
            <select disabled={!canManageMembers} value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as MemberRole })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
              {roles.map((role) => <option key={role} value={role}>{t(roleLabels[role])}</option>)}
            </select>
            <button disabled={!canManageMembers || saving} className="w-full rounded-lg bg-sky-600 px-3 py-2.5 font-semibold hover:bg-sky-500 disabled:opacity-40">{saving ? t('Küldés…') : t('Meghívás küldése')}</button>
          </form>
          {invites.length > 0 && <div className="mt-5 border-t border-slate-800 pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Függő meghívások')}</p>{invites.filter((item) => item.status === 'sent').map((item) => <p key={item.id} className="py-1 text-sm text-slate-400">{item.fullName} · {item.email}</p>)}</div>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-bold">{t('Kivitelezőcsapatok')}</h2>
        {canManageTeams && <form onSubmit={submitTeam} className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <input required value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder={t('Új csapat neve')} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
          <div className="mt-3 flex flex-wrap gap-2">{members.filter((member) => member.active).map((member) => <button type="button" key={member.uid} onClick={() => toggleMember(member.uid)} className={`rounded-full border px-3 py-1.5 text-xs ${selectedMembers.includes(member.uid) ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'}`}>{member.fullName}</button>)}</div>
          <button disabled={saving} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40">{t('Csapat létrehozása')}</button>
        </form>}
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => <TeamCard key={team.id} team={team} members={members} canManage={canManageTeams} saving={saving} onUpdate={onTeamUpdate} onDelete={onTeamDelete} />)}
          {teams.length === 0 && <p className="text-sm text-slate-500">{t('Még nincs létrehozott csapat.')}</p>}
        </div>
      </div>
      <PermissionMatrixEditor matrix={permissionMatrix} canManage={canEditPermissions} saving={saving} onChange={onPermissionChange} onSave={onPermissionSave} />
    </section>
  );
}

function TeamCard({ team, members, canManage, saving, onUpdate, onDelete }: { team: CompanyTeam; members: CompanyMember[]; canManage: boolean; saving: boolean; onUpdate: Props['onTeamUpdate']; onDelete: Props['onTeamDelete'] }) {
  const { t } = useI18n();
  const [name, setName] = useState(team.name);
  const [memberIds, setMemberIds] = useState(team.memberIds ?? []);
  return <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
    <input disabled={!canManage} value={name} onChange={(event) => setName(event.target.value)} className="w-full border-b border-slate-700 bg-transparent pb-2 font-semibold outline-none focus:border-sky-500" />
    <div className="mt-3 space-y-2">{members.filter((member) => member.active).map((member) => <label key={member.uid} className="flex items-center gap-2 text-sm text-slate-400"><input disabled={!canManage} type="checkbox" checked={memberIds.includes(member.uid)} onChange={() => setMemberIds((current) => current.includes(member.uid) ? current.filter((id) => id !== member.uid) : [...current, member.uid])} />{member.fullName}</label>)}</div>
    {canManage && <div className="mt-4 flex gap-2"><button type="button" disabled={saving || !name.trim()} onClick={() => void onUpdate(team.id, name, memberIds)} className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold disabled:opacity-40">{t('Mentés')}</button><button type="button" disabled={saving} onClick={() => { if (window.confirm(t('Biztosan törlöd ezt a csapatot: {name}?', { name: team.name }))) void onDelete(team.id); }} className="rounded-lg border border-rose-500/50 px-3 py-2 text-xs text-rose-300">{t('Törlés')}</button></div>}
  </div>;
}
