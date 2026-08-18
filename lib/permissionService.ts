import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { MemberRole } from './teamService';
import { getActiveUserContext } from './userContext';
import type { ModuleKey } from './projectService';

export type PermissionKey = 'createProjects' | 'editProjects' | 'manageSurvey' | 'manageQuote' | 'manageContract' | 'manageConstruction' | 'manageCompletion' | 'manageCalendar' | 'manageDocuments' | 'manageFinance' | 'manageTeams' | 'manageMembers' | 'manageCompany';
export type PermissionMatrix = Record<MemberRole, Record<PermissionKey, boolean>>;
export const permissionLabels: Record<PermissionKey, string> = {
  createProjects: 'Projekt létrehozása', editProjects: 'Projekt alapadatainak módosítása', manageSurvey: 'Felmérés kezelése', manageQuote: 'Ajánlat kezelése', manageContract: 'Szerződés kezelése', manageConstruction: 'Kivitelezés kezelése', manageCompletion: 'Befejezés kezelése', manageCalendar: 'Naptár és időpontok kezelése', manageDocuments: 'Dokumentumok kezelése', manageFinance: 'Pénzügy kezelése', manageTeams: 'Csapatok kezelése', manageMembers: 'Munkatársak kezelése', manageCompany: 'Céges adatok kezelése',
};
export const defaultPermissionMatrix: PermissionMatrix = {
  company_admin: { createProjects: true, editProjects: true, manageSurvey: true, manageQuote: true, manageContract: true, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: true, manageTeams: true, manageMembers: true, manageCompany: true },
  project_manager: { createProjects: true, editProjects: true, manageSurvey: true, manageQuote: true, manageContract: true, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: true, manageTeams: true, manageMembers: false, manageCompany: false },
  office: { createProjects: true, editProjects: true, manageSurvey: true, manageQuote: true, manageContract: true, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: false, manageTeams: false, manageMembers: false, manageCompany: false },
  surveyor: { createProjects: false, editProjects: false, manageSurvey: true, manageQuote: false, manageContract: false, manageConstruction: false, manageCompletion: false, manageCalendar: true, manageDocuments: true, manageFinance: false, manageTeams: false, manageMembers: false, manageCompany: false },
  installer: { createProjects: false, editProjects: false, manageSurvey: false, manageQuote: false, manageContract: false, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: false, manageTeams: false, manageMembers: false, manageCompany: false },
  finance: { createProjects: false, editProjects: false, manageSurvey: false, manageQuote: false, manageContract: false, manageConstruction: false, manageCompletion: false, manageCalendar: false, manageDocuments: false, manageFinance: true, manageTeams: false, manageMembers: false, manageCompany: false },
};

export const modulePermissionKeys: Record<ModuleKey, PermissionKey> = {
  survey: 'manageSurvey', quote: 'manageQuote', contract: 'manageContract', construction: 'manageConstruction', completion: 'manageCompletion', finance: 'manageFinance',
};

export function permissionsForRole(matrix: PermissionMatrix, role: string) {
  return role in matrix ? matrix[role as MemberRole] : defaultPermissionMatrix.company_admin;
}

async function adminContext() {
  const data = await getActiveUserContext();
  if (!['company_admin', 'admin', 'superadmin'].includes(data.role)) throw new Error('Céges adminisztrátori jogosultság szükséges.');
  return data.companyId;
}
export function subscribeToPermissionMatrix(companyId: string, callback: (matrix: PermissionMatrix) => void) {
  return onSnapshot(doc(db, 'companies', companyId, 'settings', 'permissions'), (snapshot) => {
    const stored = snapshot.exists() ? snapshot.data().roles as Partial<PermissionMatrix> : {};
    const normalized = Object.fromEntries(
      Object.entries(defaultPermissionMatrix).map(([role, defaults]) => [
        role,
        { ...defaults, ...(stored[role as MemberRole] ?? {}) },
      ]),
    ) as PermissionMatrix;
    callback(normalized);
  });
}
export async function savePermissionMatrix(matrix: PermissionMatrix) {
  const companyId = await adminContext();
  await setDoc(doc(db, 'companies', companyId, 'settings', 'permissions'), { roles: matrix, updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.uid }, { merge: true });
}
