import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { MemberRole } from './teamService';

export type PermissionKey = 'createProjects' | 'editProjects' | 'manageDocuments' | 'manageTeams' | 'manageMembers';
export type PermissionMatrix = Record<MemberRole, Record<PermissionKey, boolean>>;
export const permissionLabels: Record<PermissionKey, string> = {
  createProjects: 'Projekt létrehozása', editProjects: 'Projektek módosítása', manageDocuments: 'Dokumentumok kezelése', manageTeams: 'Csapatok kezelése', manageMembers: 'Munkatársak kezelése',
};
export const defaultPermissionMatrix: PermissionMatrix = {
  company_admin: { createProjects: true, editProjects: true, manageDocuments: true, manageTeams: true, manageMembers: true },
  project_manager: { createProjects: true, editProjects: true, manageDocuments: true, manageTeams: true, manageMembers: false },
  surveyor: { createProjects: false, editProjects: false, manageDocuments: true, manageTeams: false, manageMembers: false },
  installer: { createProjects: false, editProjects: false, manageDocuments: true, manageTeams: false, manageMembers: false },
  finance: { createProjects: false, editProjects: false, manageDocuments: false, manageTeams: false, manageMembers: false },
};

async function adminContext() {
  const user = auth.currentUser; if (!user) throw new Error('Bejelentkezés szükséges.');
  const profile = await getDoc(doc(db, 'users', user.uid)); const data = profile.data();
  if (!profile.exists() || !data?.companyId || !['company_admin', 'admin', 'superadmin'].includes(String(data.role))) throw new Error('Céges adminisztrátori jogosultság szükséges.');
  return String(data.companyId);
}
export function subscribeToPermissionMatrix(companyId: string, callback: (matrix: PermissionMatrix) => void) {
  return onSnapshot(doc(db, 'companies', companyId, 'settings', 'permissions'), (snapshot) => callback(snapshot.exists() ? snapshot.data().roles as PermissionMatrix : defaultPermissionMatrix));
}
export async function savePermissionMatrix(matrix: PermissionMatrix) {
  const companyId = await adminContext();
  await setDoc(doc(db, 'companies', companyId, 'settings', 'permissions'), { roles: matrix, updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.uid }, { merge: true });
}
