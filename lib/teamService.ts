import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';

export type MemberRole = 'company_admin' | 'project_manager' | 'surveyor' | 'installer' | 'finance';

export type CompanyMember = {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  role: MemberRole;
  active: boolean;
};

export type CompanyTeam = {
  id: string;
  name: string;
  memberIds: string[];
  active: boolean;
};

export type CompanyInvite = {
  id: string;
  fullName: string;
  email: string;
  role: MemberRole;
  status: 'sent' | 'accepted' | 'cancelled' | 'email_error';
};

export type UserContext = {
  uid: string;
  companyId: string;
  role: string;
  canManage: boolean;
};

type UserProfile = {
  companyId?: string;
  role?: string;
  active?: boolean;
  fullName?: string;
  email?: string;
};

export const roleLabels: Record<MemberRole, string> = {
  company_admin: 'Céges adminisztrátor',
  project_manager: 'Projektvezető',
  surveyor: 'Felmérő',
  installer: 'Kivitelező',
  finance: 'Pénzügy',
};

export async function getUserContext(): Promise<UserContext> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Nincs bejelentkezett felhasználó.');
  const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
  if (!snapshot.exists()) throw new Error('A felhasználói profil nem található.');
  const profile = snapshot.data() as UserProfile;
  if (profile.active === false || !profile.companyId) throw new Error('A felhasználói fiók nem aktív.');
  const role = profile.role ?? '';
  return {
    uid: currentUser.uid,
    companyId: profile.companyId,
    role,
    canManage: ['company_admin', 'admin', 'superadmin'].includes(role),
  };
}

export async function ensureCurrentMember() {
  const context = await getUserContext();
  if (!context.canManage) return context;
  const currentUser = auth.currentUser;
  if (!currentUser) return context;
  const profile = (await getDoc(doc(db, 'users', currentUser.uid))).data() as UserProfile;
  await setDoc(doc(db, 'companies', context.companyId, 'members', currentUser.uid), {
    uid: currentUser.uid,
    fullName: profile.fullName ?? currentUser.displayName ?? currentUser.email ?? 'Adminisztrátor',
    email: profile.email ?? currentUser.email ?? '',
    role: context.role === 'admin' ? 'company_admin' : context.role,
    active: true,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return context;
}

export function subscribeToMembers(companyId: string, callback: (members: CompanyMember[]) => void) {
  return onSnapshot(collection(db, 'companies', companyId, 'members'), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CompanyMember));
  });
}

export function subscribeToTeams(companyId: string, callback: (teams: CompanyTeam[]) => void) {
  return onSnapshot(collection(db, 'companies', companyId, 'teams'), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CompanyTeam));
  });
}

export function subscribeToInvites(companyId: string, callback: (invites: CompanyInvite[]) => void) {
  return onSnapshot(collection(db, 'companies', companyId, 'invites'), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CompanyInvite));
  });
}

export async function inviteCompanyMember(input: { fullName: string; email: string; role: MemberRole }) {
  const callable = httpsCallable<typeof input, { success: boolean }>(functions, 'inviteCompanyMember');
  return (await callable(input)).data;
}

export async function updateCompanyMember(input: { uid: string; role: MemberRole; active: boolean }) {
  const callable = httpsCallable<typeof input, { success: boolean }>(functions, 'updateCompanyMember');
  return (await callable(input)).data;
}

export async function createTeam(name: string, memberIds: string[]) {
  const context = await getUserContext();
  if (!context.canManage) throw new Error('Csak céges adminisztrátor hozhat létre csapatot.');
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('A csapat neve kötelező.');
  await addDoc(collection(db, 'companies', context.companyId, 'teams'), {
    name: trimmedName,
    memberIds,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTeam(teamId: string, name: string, memberIds: string[]) {
  const context = await getUserContext();
  if (!context.canManage) throw new Error('Csak céges adminisztrátor módosíthat csapatot.');
  await updateDoc(doc(db, 'companies', context.companyId, 'teams', teamId), {
    name: name.trim(),
    memberIds,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTeam(teamId: string) {
  const context = await getUserContext();
  if (!context.canManage) throw new Error('Csak céges adminisztrátor törölhet csapatot.');
  await deleteDoc(doc(db, 'companies', context.companyId, 'teams', teamId));
}
